import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r'd:\sistem_garmen_v2\erp_frontend\src\pages\PenjualanRetur.jsx'
lines = open(path, 'r', encoding='utf-8').readlines()

# Lines 480-488 (index 479-487) = status block
# Kita ganti lines 484-486 (index 483-485) saja:
# Line 484: ) : (
# Line 485: <span ... TEMPO</span>
# Line 486: )}

print("Before:")
for i in range(479, 489):
    print(f"  [{i+1}] {repr(lines[i])}")

# Sisipkan sisa_tagihan setelah baris TEMPO span (baris 485, index 484)
# Ubah dari:
#   ) : (
#       <span ...>⏳ TEMPO</span>
#   )}
# Menjadi:
#   ) : (
#       <>
#           <span ...>⏳ TEMPO</span>
#           <span class red sisa>Sisa: ...</span>
#       </>
#   )}

indent = '                                                        '

lines[483] = f'{indent[:-4]}) : (\n'
lines[484] = f'{indent}<>\n'
lines[484] += f'{indent}    <span className="px-2 py-1 rounded-md text-[10px] font-black bg-amber-100 text-amber-700">\u23f3 TEMPO</span>\n'
lines[484] += f'{indent}    <span className="text-[10px] font-black text-red-500">\n'
lines[484] += f'{indent}        Sisa: {{new Intl.NumberFormat(\'id-ID\', {{style: \'currency\', currency: \'IDR\', maximumFractionDigits: 0}}).format(h.sisa_tagihan || 0)}}\n'
lines[484] += f'{indent}    </span>\n'
lines[484] += f'{indent}</>\n'
# Hapus baris lama TEMPO span (index 484) sudah digabung di atas
# Tapi kita perlu hapus baris asli TEMPO (index 484 sekarang sudah tertimpa)

# Let's rebuild properly: replace lines 483, 484, 485 (index)
new_block = [
    f'{indent[:-4]}) : (\n',
    f'{indent}<>\n',
    f'{indent}    <span className="px-2 py-1 rounded-md text-[10px] font-black bg-amber-100 text-amber-700">\u23f3 TEMPO</span>\n',
    f'{indent}    <span className="text-[10px] font-black text-red-500">\n',
    f'{indent}        Sisa: {{new Intl.NumberFormat(\'id-ID\', {{style: \'currency\', currency: \'IDR\', maximumFractionDigits: 0}}).format(h.sisa_tagihan || 0)}}\n',
    f'{indent}    </span>\n',
    f'{indent}</>\n',
    f'{indent[:-4]})}}',
    '\n',
]

# Lines index 483 = ") : ("
# Lines index 484 = "<span TEMPO/span>"
# Lines index 485 = ")}"
lines[483:486] = new_block

open(path, 'w', encoding='utf-8').write(''.join(lines))
print("\nAfter:")
updated = open(path, 'r', encoding='utf-8').readlines()
for i in range(479, 495):
    print(f"  [{i+1}] {repr(updated[i])}")
print("\nOK: Status column patched with sisa_tagihan!")
