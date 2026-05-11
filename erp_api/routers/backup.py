from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import text
from models import get_db
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
    if format not in ['xlsx', 'sql', 'json']:
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

    elif format == 'json':
        import json
        import numpy as np
        
        json_data = {}
        for table in tables_to_export:
            model = get_table_model(table)
            if not model: continue
            
            query = db.query(model)
            if dataType in ['transaksi', 'full'] and start_date and end_date and table in trx_tables:
                if hasattr(model, 'tanggal'):
                    query = query.filter(model.tanggal >= start_date, model.tanggal <= f"{end_date} 23:59:59")
                elif hasattr(model, 'tanggal_input'):
                    query = query.filter(model.tanggal_input >= start_date, model.tanggal_input <= f"{end_date} 23:59:59")
            
            df = pd.read_sql(query.statement, db.bind)
            
            # Clean up datetime for JSON
            for col in df.select_dtypes(include=['datetime64[ns, UTC]', 'datetime64[ns]']).columns:
                df[col] = df[col].dt.tz_localize(None).astype(str)
                df[col] = df[col].replace('NaT', None)
                
            # Convert NaNs to None for valid JSON nulls
            df = df.replace({np.nan: None})
            
            json_data[table] = df.to_dict(orient="records")
            
        output = BytesIO(json.dumps(json_data, ensure_ascii=False).encode('utf-8'))
        filename = f"Backup_Raziq_{dataType}_{datetime.datetime.now().strftime('%Y%m%d_%H%M')}.json"
        return StreamingResponse(
            output, 
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

@router.post("/import")
async def import_database(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not (file.filename.endswith('.xlsx') or file.filename.endswith('.sql') or file.filename.endswith('.json')):
        return {"status": "error", "message": "Saat ini hanya mendukung restore dari file .XLSX, .SQL, atau .JSON"}
    
    try:
        contents = await file.read()
        
        if file.filename.endswith('.xlsx'):
            excel_data = pd.read_excel(BytesIO(contents), sheet_name=None)
            try:
                for sheet_name, df in excel_data.items():
                    model = get_table_model(sheet_name)
                    if not model: continue
                    db.execute(text(f"DELETE FROM {sheet_name}"))
                    records = df.to_dict(orient="records")
                    if records:
                        cleaned_records = []
                        for r in records:
                            clean_r = {}
                            for k, v in r.items():
                                if pd.isna(v): clean_r[k] = None
                                else: clean_r[k] = v
                            cleaned_records.append(clean_r)
                        db.bulk_insert_mappings(model, cleaned_records)
                db.commit()
                return {"status": "success", "message": "Database berhasil di-restore dari backup XLSX."}
            except Exception as e:
                db.rollback()
                return {"status": "error", "message": f"Gagal memproses baris data XLSX: {str(e)}"}
                
        elif file.filename.endswith('.sql'):
            try:
                # To safely restore SQL, we should execute it statement by statement
                sql_text = contents.decode('utf-8').replace('\r', '')
                statements = [s.strip() for s in sql_text.split(';\n') if s.strip()]
                
                # Extract table names from INSERT statements to clear them first
                import re
                tables_to_clear = set()
                for stmt in statements:
                    match = re.search(r'INSERT INTO (\w+)', stmt, re.IGNORECASE)
                    if match:
                        tables_to_clear.add(match.group(1))
                
                for t in tables_to_clear:
                    db.execute(text(f"DELETE FROM {t}"))
                
                for stmt in statements:
                    db.execute(text(stmt))
                    
                db.commit()
                return {"status": "success", "message": "Database berhasil di-restore dari backup SQL."}
            except Exception as e:
                db.rollback()
                return {"status": "error", "message": f"Gagal mengeksekusi script SQL: {str(e)}"}
                
        elif file.filename.endswith('.json'):
            import json
            try:
                json_data = json.loads(contents.decode('utf-8'))
                for table_name, records in json_data.items():
                    model = get_table_model(table_name)
                    if not model: continue
                    
                    db.execute(text(f"DELETE FROM {table_name}"))
                    
                    if records:
                        cleaned_records = []
                        for r in records:
                            clean_r = {}
                            for k, v in r.items():
                                if pd.isna(v) or v == 'NaT': clean_r[k] = None
                                else: clean_r[k] = v
                            cleaned_records.append(clean_r)
                        
                        db.bulk_insert_mappings(model, cleaned_records)
                db.commit()
                return {"status": "success", "message": "Database berhasil di-restore dari backup JSON."}
            except Exception as e:
                db.rollback()
                return {"status": "error", "message": f"Gagal memproses file JSON: {str(e)}"}

    except Exception as e:
        return {"status": "error", "message": f"Gagal membaca file: {str(e)}"}
