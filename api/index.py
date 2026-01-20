from http.server import BaseHTTPRequestHandler
import json
import os
import random
import io
from datetime import datetime, timedelta

# Import dependencies
# Note: In Vercel, these must be in requirements.txt
try:
    from faker import Faker
    from supabase import create_client
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    pass  # Allow import to fail during build/check if libs aren't there yet

# --- Seeder Logic (Adapted from seeder.py) ---

# Initialize Faker
fake = Faker('id_ID')

# Constants
IJAZAH_OPTIONS = ['SD', 'SMP', 'MI', 'MTs']
TINGKAT_OPTIONS = ['MTs', 'MA']
PROGRAM_OPTIONS = ['Reguler', 'Tahfidz', 'Tahfidz Intensif']
STATUS_ORTU_OPTIONS = ['Hidup', 'Meninggal']
PEKERJAAN_OPTIONS = [
    'Petani', 'Pedagang', 'PNS', 'Guru', 'Wiraswasta', 
    'Buruh', 'Nelayan', 'TNI/Polri', 'Dokter', 'Karyawan Swasta',
    'Ibu Rumah Tangga', 'Pensiunan', 'Sopir', 'Tukang', 'Tidak Bekerja'
]
PROVINSI_OPTIONS = [
    'Jawa Barat', 'Jawa Tengah', 'Jawa Timur', 'DKI Jakarta', 
    'Banten', 'DIY Yogyakarta', 'Lampung', 'Sumatera Selatan'
]
FILE_TYPES = {
    'foto': {'label': 'Pas Foto', 'color': (76, 175, 80)},      
    'ijazah': {'label': 'Ijazah', 'color': (33, 150, 243)},     
    'akta': {'label': 'Akta Kelahiran', 'color': (255, 152, 0)}, 
    'kk': {'label': 'Kartu Keluarga', 'color': (156, 39, 176)},  
    'bpjs': {'label': 'BPJS (Opsional)', 'color': (0, 150, 136)} 
}

def generate_placeholder_image(file_type: str, nisn: str, nama: str, target_kb: int = 2) -> bytes:
    width, height = 200, 150
    config = FILE_TYPES.get(file_type, {'label': file_type.upper(), 'color': (100, 100, 100)})
    bg_color = config['color']
    label = config['label']
    
    img = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Simple default font
    font_large = ImageFont.load_default()
    font_small = ImageFont.load_default()
    
    # Draw content
    draw.rectangle([10, 10, width - 10, height - 10], fill=(255, 255, 255), outline=bg_color, width=2)
    draw.text((width // 2, 30), label, fill=bg_color, font=font_large, anchor="mm")
    draw.text((width // 2, 60), f"NISN: {nisn}", fill=bg_color, font=font_small, anchor="mm")
    
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG', quality=50)
    return buffer.getvalue()

def generate_pendaftar():
    jenis_kelamin = random.choice(['L', 'P'])
    nama_lengkap = fake.name_male() if jenis_kelamin == 'L' else fake.name_female()
    
    return {
        'nikcalon': fake.numerify('################'),
        'nisn': fake.numerify('##########'),
        'namalengkap': nama_lengkap,
        'tempatlahir': fake.city(),
        'tanggallahir': fake.date_between(start_date='-18y', end_date='-10y').strftime('%Y-%m-%d'),
        'jeniskelamin': jenis_kelamin,
        'alamatjalan': fake.street_address(),
        'desa': fake.city_suffix() + ' ' + fake.last_name(),
        'kecamatan': 'Kec. ' + fake.city(),
        'kotakabupaten': 'Kab. ' + fake.city(),
        'provinsi': random.choice(PROVINSI_OPTIONS),
        'ijazahformalterakhir': random.choice(IJAZAH_OPTIONS),
        'rencanatingkat': random.choice(TINGKAT_OPTIONS),
        'rencanaprogram': random.choice(PROGRAM_OPTIONS),
        'namaayah': fake.name_male(),
        'nikayah': fake.numerify('################'),
        'statusayah': random.choice(STATUS_ORTU_OPTIONS),
        'pekerjaanayah': random.choice(PEKERJAAN_OPTIONS),
        'namaibu': fake.name_female(),
        'nikibu': fake.numerify('################'),
        'statusibu': random.choice(STATUS_ORTU_OPTIONS),
        'pekerjaanibu': random.choice(PEKERJAAN_OPTIONS),
        'telepon_orang_tua': '08' + fake.numerify('##########'),
        'statusberkas': 'PENDING',
        'gelombang': random.choice(['Gelombang 1', 'Gelombang 2', 'Gelombang 3']),
    }

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        logs = []
        
        try:
            # Read body
            content_length = int(self.headers.get('Content-Length', 0))
            body_str = self.rfile.read(content_length).decode('utf-8')
            body = json.loads(body_str)
            
            count = body.get('count', 10)
            with_files = body.get('withFiles', True)
            
            # Init Supabase
            if not supabase_url or not supabase_key:
                raise Exception("Missing Supabase credentials in environment variables")
            
            supabase = create_client(supabase_url, supabase_key)
            
            logs.append(f"Starting seeding for {count} records...")
            
            success_count = 0
            
            for i in range(count):
                data = generate_pendaftar()
                nisn = data['nisn']
                nama = data['namalengkap']
                
                # Insert
                res = supabase.table('pendaftar').insert(data).execute()
                
                if res.data:
                    success_count += 1
                    logs.append(f"✅ [{i+1}/{count}] {nama} (NISN: {nisn}) created.")
                    
                    if with_files:
                        files_to_upload = ['foto', 'ijazah', 'akta', 'kk']
                        for ftype in files_to_upload:
                            try:
                                img_bytes = generate_placeholder_image(ftype, nisn, nama)
                                path = f"{nisn}/{ftype}_{fake.numerify('####')}.jpg"
                                supabase.storage.from_("pendaftar-files").upload(
                                    path=path,
                                    file=img_bytes,
                                    file_options={"content-type": "image/jpeg"}
                                )
                            except Exception as e:
                                pass # Ignore upload errors to keep it fast
                        logs.append(f"   + Files uploaded for {nisn}")
                else:
                    logs.append(f"❌ [{i+1}/{count}] Failed to insert")
            
            logs.append(f"🏁 Finished! Success: {success_count}/{count}")
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "logs": logs}).encode('utf-8'))
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": str(e), "logs": logs}).encode('utf-8'))

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        self.wfile.write("Seeder API is ready. Send POST request to trigger.".encode('utf-8'))
