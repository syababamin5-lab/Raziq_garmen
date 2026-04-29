content = """
def _draw_qr_to_pdf(pdf, config, x_pos):
    try:
        import requests
        import tempfile
        nama_p = config.nama_pemilik if config else "Yana Taryana"
        qr_url = f"https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=VALIDATED_BY_{nama_p.replace(' ', '_')}"
        res = requests.get(qr_url, timeout=5)
        if res.status_code == 200:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tf:
                tf.write(res.content)
                temp_name = tf.name
            pdf.image(temp_name, x=x_pos, y=pdf.get_y(), w=22)
            pdf.ln(22)
        else:
            pdf.ln(22)
    except:
        pdf.ln(22)
"""
with open('d:/sistem_garmen_v2/erp_api/pdf_generator.py', 'a') as f:
    f.write(content)
print("Helper function appended successfully.")
