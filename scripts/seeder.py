#!/usr/bin/env python3
"""
📝 PPDB Test Data Seeder Bot (with File Upload)
================================================
Generate fake pendaftar data for testing and insert directly to Supabase.
Now includes automatic upload of placeholder document files!

Usage:
    python seeder.py --count 10           # Create 10 fake pendaftar with files
    python seeder.py --count 50           # Create 50 fake pendaftar with files  
    python seeder.py --count 10 --no-files # Create without uploading files
    python seeder.py --dry-run            # Preview sample data without inserting

Before running:
1. pip install faker supabase python-dotenv pillow
2. Copy .env.example to .env and fill your Supabase credentials
"""

import os
import sys
import argparse
import random
import io
from datetime import datetime, timedelta

# === Auto-install dependencies ===
try:
    from faker import Faker
except ImportError:
    print("❌ Installing Faker...")
    os.system("pip install faker")
    from faker import Faker

try:
    from supabase import create_client
except ImportError:
    print("❌ Installing Supabase...")
    os.system("pip install supabase")
    from supabase import create_client

try:
    from dotenv import load_dotenv
except ImportError:
    print("❌ Installing python-dotenv...")
    os.system("pip install python-dotenv")
    from dotenv import load_dotenv

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("❌ Installing Pillow...")
    os.system("pip install pillow")
    from PIL import Image, ImageDraw, ImageFont

# Load environment variables
load_dotenv()

# Supabase credentials from environment
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Error: Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env file")
    print("   Copy .env.example to .env and fill in your credentials")
    sys.exit(1)

# Initialize Supabase client
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Initialize Faker with Indonesian locale
fake = Faker('id_ID')

# Constants for random selection
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

# File types required for pendaftar
FILE_TYPES = {
    'foto': {'label': 'Pas Foto', 'color': (76, 175, 80)},      # Green
    'ijazah': {'label': 'Ijazah', 'color': (33, 150, 243)},     # Blue
    'akta': {'label': 'Akta Kelahiran', 'color': (255, 152, 0)}, # Orange
    'kk': {'label': 'Kartu Keluarga', 'color': (156, 39, 176)},  # Purple
    'bpjs': {'label': 'BPJS (Opsional)', 'color': (0, 150, 136)} # Teal
}


def generate_placeholder_image(file_type: str, nisn: str, nama: str, target_kb: int = 2) -> bytes:
    """
    Generate a small placeholder image (~2KB) with label text.
    Returns JPEG bytes optimized to be around target_kb.
    """
    # Small image size for ~2KB output
    width, height = 200, 150
    
    # Get color for this file type
    config = FILE_TYPES.get(file_type, {'label': file_type.upper(), 'color': (100, 100, 100)})
    bg_color = config['color']
    label = config['label']
    
    # Create image with colored background
    img = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Try to use a basic font, fallback to default if not available
    try:
        font_large = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16)
        font_small = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 10)
    except:
        try:
            font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
        except:
            font_large = ImageFont.load_default()
            font_small = ImageFont.load_default()
    
    # Draw white rectangle as content area
    margin = 10
    draw.rectangle([margin, margin, width - margin, height - margin], 
                   fill=(255, 255, 255), outline=bg_color, width=2)
    
    # Draw text
    text_color = bg_color
    
    # Label at top
    draw.text((width // 2, 30), label, fill=text_color, font=font_large, anchor="mm")
    
    # NISN
    draw.text((width // 2, 60), f"NISN: {nisn}", fill=text_color, font=font_small, anchor="mm")
    
    # Name (truncate if too long)
    nama_display = nama[:20] + "..." if len(nama) > 20 else nama
    draw.text((width // 2, 80), nama_display, fill=text_color, font=font_small, anchor="mm")
    
    # Fake document tag
    draw.text((width // 2, 110), "[DOKUMEN TEST]", fill=(150, 150, 150), font=font_small, anchor="mm")
    
    # Date
    draw.text((width // 2, 130), datetime.now().strftime("%Y-%m-%d"), 
              fill=(150, 150, 150), font=font_small, anchor="mm")
    
    # Compress to target size (~2KB)
    quality = 50  # Start with low quality for small file
    buffer = io.BytesIO()
    
    # Try different quality levels to get close to target
    for q in [50, 40, 30, 20, 15]:
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=q, optimize=True)
        size_kb = buffer.tell() / 1024
        if size_kb <= target_kb + 0.5:  # Allow small margin
            break
    
    return buffer.getvalue()


def upload_file_to_storage(nisn: str, file_type: str, file_bytes: bytes) -> str:
    """
    Upload file to Supabase Storage bucket 'pendaftar-files'.
    Returns the public URL of the uploaded file.
    """
    # Generate filename matching the expected format from upload_file.py
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{file_type}_{timestamp}.jpg"
    storage_path = f"{nisn}/{filename}"
    
    try:
        # Upload to storage
        result = supabase.storage.from_("pendaftar-files").upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": "image/jpeg"}
        )
        
        # Get public URL
        public_url = supabase.storage.from_("pendaftar-files").get_public_url(storage_path)
        return public_url
        
    except Exception as e:
        error_msg = str(e)
        if "duplicate" in error_msg.lower() or "already exists" in error_msg.lower():
            # File exists, just get the URL
            return supabase.storage.from_("pendaftar-files").get_public_url(storage_path)
        raise e


def generate_nik():
    """Generate random 16-digit NIK"""
    return fake.numerify('################')

def generate_nisn():
    """Generate random 10-digit NISN"""
    return fake.numerify('##########')

def generate_phone():
    """Generate Indonesian phone number"""
    prefix = random.choice(['0812', '0813', '0852', '0853', '0821', '0822', '0857', '0858'])
    return prefix + fake.numerify('########')

def generate_birth_date():
    """Generate birth date for school-age student (10-18 years old)"""
    today = datetime.now()
    min_age = 10
    max_age = 18
    start_date = today - timedelta(days=max_age * 365)
    end_date = today - timedelta(days=min_age * 365)
    birth_date = fake.date_between(start_date=start_date, end_date=end_date)
    return birth_date.strftime('%Y-%m-%d')

def generate_pendaftar():
    """Generate a single fake pendaftar record with ALL required fields"""
    jenis_kelamin = random.choice(['L', 'P'])
    
    # Generate names based on gender
    if jenis_kelamin == 'L':
        nama_lengkap = fake.name_male()
    else:
        nama_lengkap = fake.name_female()
    
    provinsi = random.choice(PROVINSI_OPTIONS)
    
    return {
        # === Data Calon Santri ===
        'nikcalon': generate_nik(),
        'nisn': generate_nisn(),
        'namalengkap': nama_lengkap,
        'tempatlahir': fake.city(),
        'tanggallahir': generate_birth_date(),
        'jeniskelamin': jenis_kelamin,
        
        # === Alamat ===
        'alamatjalan': fake.street_address(),
        'desa': fake.city_suffix() + ' ' + fake.last_name(),
        'kecamatan': 'Kec. ' + fake.city(),
        'kotakabupaten': 'Kab. ' + fake.city(),
        'provinsi': provinsi,
        
        # === Pendidikan ===
        'ijazahformalterakhir': random.choice(IJAZAH_OPTIONS),
        'rencanatingkat': random.choice(TINGKAT_OPTIONS),
        'rencanaprogram': random.choice(PROGRAM_OPTIONS),
        
        # === Data Ayah ===
        'namaayah': fake.name_male(),
        'nikayah': generate_nik(),
        'statusayah': random.choice(STATUS_ORTU_OPTIONS),
        'pekerjaanayah': random.choice(PEKERJAAN_OPTIONS),
        
        # === Data Ibu ===
        'namaibu': fake.name_female(),
        'nikibu': generate_nik(),
        'statusibu': random.choice(STATUS_ORTU_OPTIONS),
        'pekerjaanibu': random.choice(PEKERJAAN_OPTIONS),
        
        # === Kontak ===
        'telepon_orang_tua': generate_phone(),
        
        # === Status default (match actual DB schema) ===
        'statusberkas': 'PENDING',
        
        # === Gelombang ===
        'gelombang': random.choice(['Gelombang 1', 'Gelombang 2', 'Gelombang 3']),
    }



def upload_files_for_pendaftar(nisn: str, nama: str, include_bpjs: bool = True) -> dict:
    """
    Generate and upload all required document files for a pendaftar.
    Returns dict of file_type -> public_url
    """
    uploaded_files = {}
    
    # Required files
    required_files = ['foto', 'ijazah', 'akta', 'kk']
    
    # Optionally include BPJS (50% chance by default)
    if include_bpjs and random.random() > 0.5:
        required_files.append('bpjs')
    
    for file_type in required_files:
        try:
            # Generate placeholder image
            img_bytes = generate_placeholder_image(file_type, nisn, nama, target_kb=2)
            
            # Upload to storage
            url = upload_file_to_storage(nisn, file_type, img_bytes)
            uploaded_files[file_type] = url
            
        except Exception as e:
            print(f"      ⚠️  Failed to upload {file_type}: {str(e)[:50]}")
    
    return uploaded_files


def seed_pendaftar(count: int, with_files: bool = True):
    """Insert multiple fake pendaftar records into Supabase with optional file uploads"""
    print(f"\n🌱 Seeding {count} pendaftar records to Supabase...")
    print(f"   URL: {SUPABASE_URL[:50]}...")
    print(f"   📁 File upload: {'✅ Enabled' if with_files else '❌ Disabled'}")
    
    success_count = 0
    error_count = 0
    files_uploaded = 0
    
    for i in range(count):
        try:
            data = generate_pendaftar()
            nisn = data['nisn']
            nama = data['namalengkap']
            
            # Insert pendaftar record
            result = supabase.table('pendaftar').insert(data).execute()
            
            if result.data:
                success_count += 1
                print(f"  ✅ [{i+1}/{count}] {nama} (NISN: {nisn})")
                
                # Upload files if enabled
                if with_files:
                    print(f"      📁 Uploading files...")
                    uploaded = upload_files_for_pendaftar(nisn, nama)
                    files_uploaded += len(uploaded)
                    file_list = ', '.join(uploaded.keys())
                    print(f"      ✅ Uploaded: {file_list}")
            else:
                error_count += 1
                print(f"  ❌ [{i+1}/{count}] Failed to insert")
                
        except Exception as e:
            error_count += 1
            print(f"  ❌ [{i+1}/{count}] Error: {str(e)[:80]}")
    
    print(f"\n{'='*50}")
    print(f"📊 SUMMARY")
    print(f"{'='*50}")
    print(f"   ✅ Pendaftar Success: {success_count}")
    print(f"   ❌ Pendaftar Failed: {error_count}")
    print(f"   📝 Total Pendaftar: {count}")
    if with_files:
        print(f"   📁 Files Uploaded: {files_uploaded}")
    print(f"{'='*50}\n")
    
    return success_count, error_count


def main():
    print("\n" + "="*50)
    print("🤖 PPDB Test Data Seeder Bot (v2.0)")
    print("    Now with File Upload Support! 📁")
    print("="*50)
    
    parser = argparse.ArgumentParser(description='Seed fake pendaftar data for testing')
    parser.add_argument('--count', '-c', type=int, default=10, 
                        help='Number of fake pendaftar to create (default: 10)')
    parser.add_argument('--dry-run', '-d', action='store_true',
                        help='Show sample data without inserting')
    parser.add_argument('--no-files', action='store_true',
                        help='Skip file uploads (only create data records)')
    
    args = parser.parse_args()
    
    if args.dry_run:
        print("\n🔍 DRY RUN - Sample data (not inserted):\n")
        sample = generate_pendaftar()
        print("📋 Data Pendaftar:")
        for key, value in sample.items():
            print(f"    {key}: {value}")
        
        print("\n📁 Files that would be uploaded:")
        for file_type, config in FILE_TYPES.items():
            print(f"    • {config['label']} ({file_type}.jpg) - ~2KB placeholder")
        
        print("\n✨ All fields will be auto-generated like above")
        return
    
    seed_pendaftar(args.count, with_files=not args.no_files)


if __name__ == '__main__':
    main()
