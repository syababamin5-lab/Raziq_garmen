from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
import models
import pandas as pd
from io import BytesIO
from fastapi.responses import StreamingResponse
import datetime

router = APIRouter(prefix="/api/admin/database", tags=["Database Backup"])

def get_table_model(table_name: str):
    mapper = {
        "barang": models.Barang,
        "mitra": models.Mitra,
        "karyawan": models.Karyawan,
        "header_penjualan": models.HeaderPenjualan,
        "detail_penjualan": models.DetailPenjualan,
        "header_pembelian": models.HeaderPembelian,
        "detail_pembelian": models.DetailPembelian,
        "production_logs": models.ProductionLog,
        "wip_saldo_awal": models.WipSaldoAwal,
        "jurnal_umum": models.JurnalUmum,
        "users": models.User,
        "company_config": models.CompanyConfig
    }
    return mapper.get(table_name)

@router.get("/export")
def export_database(dataType: str = 'full', format: str = 'xlsx', start_date: str = None, end_date: str = None, db: Session = Depends(get_db)):
    if format not in ['xlsx', 'sql']:
        raise HTTPException(status_code=400, detail="Format tidak didukung")

    master_tables = ["barang", "mitra", "karyawan", "users", "company_config"]
    trx_tables = ["header_penjualan", "detail_penjualan", "header_pembelian", "detail_pembelian", "production_logs", "wip_saldo_awal", "jurnal_umum"]
    
    tables_to_export = []
    if dataType == 'full':
        tables_to_export = master_tables + trx_tables
    elif dataType == 'master':
        tables_to_export = master_tables
    elif dataType == 'transaksi':
        tables_to_export = trx_tables

    if format == 'xlsx':
        output = BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            for table in tables_to_export:
                model = get_table_model(table)
                if not model: continue
                
                query = db.query(model)
                
                # Apply date filter for transactions if provided
                if dataType in ['transaksi', 'full'] and start_date and end_date and table in trx_tables:
                    # Not all tables have 'tanggal'. production_logs uses 'tanggal', header uses 'tanggal', wip uses 'tanggal_input'
                    if hasattr(model, 'tanggal'):
                        query = query.filter(model.tanggal >= start_date, model.tanggal <= f"{end_date} 23:59:59")
                    elif hasattr(model, 'tanggal_input'):
                        query = query.filter(model.tanggal_input >= start_date, model.tanggal_input <= f"{end_date} 23:59:59")

                df = pd.read_sql(query.statement, db.bind)
                
                # Clean up datetime columns for excel
                for col in df.select_dtypes(include=['datetime64[ns, UTC]', 'datetime64[ns]']).columns:
                    df[col] = df[col].dt.tz_localize(None)
                
                if df.empty:
                    df = pd.DataFrame(columns=[c.name for c in model.__table__.columns])
                
                df.to_excel(writer, sheet_name=table[:31], index=False)
        
        output.seek(0)
        filename = f"Backup_Raziq_{dataType}_{datetime.datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
        return StreamingResponse(
            output, 
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    elif format == 'sql':
        sql_statements = []
        for table in tables_to_export:
            model = get_table_model(table)
            if not model: continue
            
            query = db.query(model)
            if dataType in ['transaksi', 'full'] and start_date and end_date and table in trx_tables:
                if hasattr(model, 'tanggal'):
                    query = query.filter(model.tanggal >= start_date, model.tanggal <= f"{end_date} 23:59:59")
                elif hasattr(model, 'tanggal_input'):
                    query = query.filter(model.tanggal_input >= start_date, model.tanggal_input <= f"{end_date} 23:59:59")

            records = query.all()
            for record in records:
                cols = []
                vals = []
                for column in model.__table__.columns:
                    val = getattr(record, column.name)
                    cols.append(column.name)
                    if val is None:
                        vals.append("NULL")
                    elif isinstance(val, (int, float)):
                        vals.append(str(val))
                    elif isinstance(val, datetime.datetime):
                        vals.append(f"'{val.strftime('%Y-%m-%d %H:%M:%S')}'")
                    else:
                        safe_val = str(val).replace("'", "''")
                        vals.append(f"'{safe_val}'")
                
                sql = f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({', '.join(vals)});"
                sql_statements.append(sql)
            sql_statements.append("\n") # Add spacing between tables
            
        output = BytesIO("\n".join(sql_statements).encode('utf-8'))
        filename = f"Backup_Raziq_{dataType}_{datetime.datetime.now().strftime('%Y%m%d_%H%M')}.sql"
        return StreamingResponse(
            output, 
            media_type="application/sql",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

@router.post("/import")
async def import_database(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.xlsx'):
        return {"status": "error", "message": "Saat ini hanya mendukung restore dari file .XLSX"}
    
    try:
        contents = await file.read()
        excel_data = pd.read_excel(BytesIO(contents), sheet_name=None)
        
        # We need to drop dependent tables first or just truncate all involved tables
        # For safety and to avoid FK constraint issues in postgres (though SQLite is looser), 
        # we will process deletes in reverse order and inserts in order if possible.
        # But we don't have hard FK constraints enforced in these models mostly.
        
        tables_in_file = excel_data.keys()
        
        # Begin transaction
        try:
            for sheet_name, df in excel_data.items():
                model = get_table_model(sheet_name)
                if not model:
                    continue # Skip unknown sheets
                
                # Truncate table
                db.execute(text(f"DELETE FROM {sheet_name}"))
                
                # Insert records
                records = df.to_dict(orient="records")
                if records:
                    # SQLite bulk insert handles NaNs poorly sometimes, replace NaN with None
                    # Clean records
                    cleaned_records = []
                    for r in records:
                        clean_r = {}
                        for k, v in r.items():
                            if pd.isna(v):
                                clean_r[k] = None
                            else:
                                clean_r[k] = v
                        cleaned_records.append(clean_r)
                    
                    db.bulk_insert_mappings(model, cleaned_records)
                    
            db.commit()
            return {"status": "success", "message": "Database berhasil di-restore dari backup."}
        except Exception as e:
            db.rollback()
            return {"status": "error", "message": f"Gagal memproses baris data: {str(e)}"}
            
    except Exception as e:
        return {"status": "error", "message": f"Gagal membaca file: {str(e)}"}
