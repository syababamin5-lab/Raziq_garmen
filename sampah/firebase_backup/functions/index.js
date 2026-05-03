const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const exceljs = require("exceljs");
const { DateTime } = require("luxon");

// 1. Database Init
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(require("./firebase-key.json"))
    });
}
const db = admin.firestore();
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// 2. Master Data Endpoints
app.get("/api/master/barang", async (req, res) => {
    const snap = await db.collection("inventory").get();
    res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});

app.get("/api/master/karyawan", async (req, res) => {
    const snap = await db.collection("employees").get();
    res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});

app.get("/api/master/mitra", async (req, res) => {
    const snap = await db.collection("mitra").get();
    res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});

app.get("/api/master/akun", async (req, res) => {
    const snap = await db.collection("coa").get();
    res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});

app.post("/api/master/barang", async (req, res) => {
    const data = req.body;
    const cek = await db.collection("inventory").where("kode_sku", "==", data.kode_sku).get();
    if (!cek.empty) return res.json({ status: "error", message: "SKU sudah ada!" });
    
    await db.collection("inventory").add({ ...data, stok_saat_ini: 0 });
    res.json({ status: "success", message: "Barang ditambahkan" });
});

// 3. Dashboard Stats
app.get("/api/dashboard/stats", async (req, res) => {
    try {
        const startOfMonth = DateTime.now().startOf('month').toJSDate();
        const ledgerSnap = await db.collection("ledger").where("tanggal", ">=", startOfMonth).get();
        
        let omzet = 0, hpp = 0, biaya = 0;
        ledgerSnap.forEach(doc => {
            const j = doc.data();
            const kode = j.kode_akun || "";
            if (kode === "41110") omzet += (j.kredit - j.debit);
            else if (kode === "51111") hpp += (j.debit - j.kredit);
            else if (kode.startsWith("61")) biaya += (j.debit - j.kredit);
        });

        const mitraSnap = await db.collection("mitra").get();
        let totPiutang = 0, totUtang = 0;
        mitraSnap.forEach(doc => {
            const d = doc.data();
            totPiutang += (d.saldo_piutang || 0);
            totUtang += (d.saldo_utang || 0);
        });

        const kasSnap = await db.collection("ledger").where("kode_akun", "in", ["11110", "11120"]).get();
        let saldoKas = 0;
        kasSnap.forEach(doc => {
            const v = doc.data();
            saldoKas += (v.debit - v.kredit);
        });

        res.json({
            omzet_bulan_ini: omzet,
            laba_kotor: omzet - hpp,
            total_piutang: totPiutang,
            total_utang: totUtang,
            saldo_kas_bank: saldoKas,
            biaya_operasional: biaya
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 4. Produksi (Cutting & Jahit)
app.post("/api/produksi/cutting", async (req, res) => {
    try {
        const p = req.body;
        const batch = db.batch();
        
        const kainSnap = await db.collection("inventory").doc(p.kain_id).get();
        const produkSnap = await db.collection("inventory").doc(p.produk_id).get();
        const karySnap = await db.collection("employees").doc(p.tukang_potong_id).get();
        
        const kain = kainSnap.data();
        if (p.kg_pakai > (kain.stok_saat_ini || 0)) return res.json({ success: false, message: "Stok kain tidak cukup!" });

        const nilaiKain = p.kg_pakai * (kain.harga_modal || 0);
        const upah = p.hasil_pcs * p.ongkos_per_pcs;
        const ket = `Cutting ${p.hasil_pcs} pcs [SKU:${produkSnap.data().kode_sku}] [Potong: ${karySnap.data().nama_karyawan}]`;

        batch.update(kainSnap.ref, { stok_saat_ini: kain.stok_saat_ini - p.kg_pakai });
        batch.set(db.collection("ledger").doc(), { tanggal: admin.firestore.Timestamp.now(), kode_akun: "51110", nama_akun: "Bahan Baku", keterangan: ket, debit: nilaiKain, kredit: 0 });
        batch.set(db.collection("ledger").doc(), { tanggal: admin.firestore.Timestamp.now(), kode_akun: "12110", nama_akun: "Persediaan Kain", keterangan: `Terpakai ${kain.nama_barang}`, debit: 0, kredit: nilaiKain });
        
        await batch.commit();
        res.json({ success: true, message: "Cutting berhasil tercatat di Cloud Node.js" });
    } catch (e) { res.json({ success: false, message: e.message }); }
});

app.post("/api/produksi/jahit", async (req, res) => {
    try {
        const p = req.body;
        const totalPcs = p.qty_lusin * 12;
        const prdSnap = await db.collection("inventory").doc(p.produk_id).get();
        const prd = prdSnap.data();

        const batch = db.batch();
        batch.update(prdSnap.ref, { stok_saat_ini: (prd.stok_saat_ini || 0) + totalPcs });
        
        const nilai = p.qty_lusin * (prd.harga_modal || 0);
        batch.set(db.collection("ledger").doc(), { tanggal: admin.firestore.Timestamp.now(), kode_akun: "12150", nama_akun: "Persediaan Barang Jadi", keterangan: `Masuk ${totalPcs} pcs (Jahit)`, debit: nilai, kredit: 0 });
        batch.set(db.collection("ledger").doc(), { tanggal: admin.firestore.Timestamp.now(), kode_akun: "51199", nama_akun: "Ikhtisar Produksi", keterangan: `Gudang ${prd.kode_sku}`, debit: 0, kredit: nilai });

        await batch.commit();
        res.json({ success: true, message: "Jahit berhasil" });
    } catch (e) { res.json({ success: false, message: e.message }); }
});

// 5. Penjualan & Invoice
app.post("/api/penjualan/invoice", async (req, res) => {
    try {
        const p = req.body;
        const invNo = `INV-${DateTime.now().toFormat('yyMMdd')}-${Math.floor(1000 + Math.random() * 9000)}`;
        const batch = db.batch();
        
        let totalOmzet = 0, totalHpp = 0;
        for (const item of p.items) {
            totalOmzet += item.subtotal;
            totalHpp += (item.qty * item.harga_modal);
            const ref = db.collection("inventory").doc(item.barang_id);
            const snap = await ref.get();
            batch.update(ref, { stok_saat_ini: (snap.data().stok_saat_ini || 0) - item.qty });
        }

        if (p.status_bayar === "Piutang") {
            const mRef = db.collection("mitra").doc(String(p.customer_id));
            const mSnap = await mRef.get();
            batch.update(mRef, { saldo_piutang: (mSnap.data().saldo_piutang || 0) + totalOmzet });
        }

        const akunDebit = p.status_bayar === "Tunai" ? "11110" : p.status_bayar === "Transfer" ? "11120" : "11210";
        batch.set(db.collection("ledger").doc(), { tanggal: admin.firestore.Timestamp.now(), kode_akun: akunDebit, nama_akun: "Kas/Bank/Piutang", keterangan: `Sales ${invNo}`, debit: totalOmzet, kredit: 0 });
        batch.set(db.collection("ledger").doc(), { tanggal: admin.firestore.Timestamp.now(), kode_akun: "41110", nama_akun: "Pendapatan", keterangan: `Sales ${invNo}`, debit: 0, kredit: totalOmzet });
        
        batch.set(db.collection("invoices").doc(invNo), { ...p, no_invoice: invNo, total_omzet: totalOmzet, tanggal: admin.firestore.Timestamp.now() });
        
        await batch.commit();
        res.json({ success: true, data: { no_invoice: invNo } });
    } catch (e) { res.json({ success: false, message: e.message }); }
});

// 6. Keuangan (Piutang, Utang, Mutasi)
app.post("/api/keuangan/terima-piutang", async (req, res) => {
    try {
        const p = req.body;
        const ref = db.collection("mitra").doc(String(p.customer_id));
        const snap = await ref.get();
        const batch = db.batch();
        batch.update(ref, { saldo_piutang: (snap.data().saldo_piutang || 0) - p.nominal });
        
        const akun = p.sumber === "Kas Tunai" ? "11110" : "11120";
        batch.set(db.collection("ledger").doc(), { tanggal: admin.firestore.Timestamp.now(), kode_akun: akun, nama_akun: "Kas/Bank", keterangan: `Recv AR: ${snap.data().nama_mitra}`, debit: p.nominal, kredit: 0 });
        batch.set(db.collection("ledger").doc(), { tanggal: admin.firestore.Timestamp.now(), kode_akun: "11210", nama_akun: "Piutang Usaha", keterangan: `Recv AR: ${snap.data().nama_mitra}`, debit: 0, kredit: p.nominal });
        
        await batch.commit();
        res.json({ success: true, message: "Penerimaan piutang berhasil" });
    } catch (e) { res.json({ success: false, message: e.message }); }
});

// 7. Import Excel (Engine Baru)
const upload = multer({ storage: multer.memoryStorage() });
app.post("/api/master/import-excel", upload.single("file"), async (req, res) => {
    try {
        const workbook = new exceljs.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const sheet = workbook.getWorksheet(1);
        const batch = db.batch();
        let totalCount = 0;

        sheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) { // Skip Header
                const sku = String(row.getCell(2).value).trim();
                const newRef = db.collection("inventory").doc(); // random ID
                batch.set(newRef, {
                    nama_barang: row.getCell(3).value,
                    kode_sku: sku,
                    kategori: req.body.tipe === "BAJU" ? "BARANG_JADI" : "BAHAN_BAKU",
                    stok_saat_ini: parseFloat(row.getCell(4).value || 0),
                    harga_modal: parseFloat(row.getCell(5).value || 0),
                    harga_jual: parseFloat(row.getCell(6).value || 0)
                });
                totalCount++;
            }
        });

        await batch.commit();
        res.json({ status: "success", message: `Berhasil import ${totalCount} data via Node.js` });
    } catch (e) { res.json({ status: "error", message: e.message }); }
});

// Export App to Firebase
exports.app = functions.https.onRequest(app);
