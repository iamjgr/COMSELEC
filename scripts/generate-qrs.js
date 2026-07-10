// generate-qrs.js
// Run: node scripts/generate-qrs.js
// Input: voters.csv (in root dir)
// Output: /qr-output/<student_id>.png + tokens-and-pins.csv

const QRCode = require('qrcode');
const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  if (!fs.existsSync('voters.csv')) {
    console.error("voters.csv not found in the root directory.");
    process.exit(1);
  }

  const raw = fs.readFileSync('voters.csv');
  const voters = parse(raw, { columns: true, skip_empty_lines: true });
  const output = [];

  if (!fs.existsSync('./qr-output')) {
    fs.mkdirSync('./qr-output');
  }

  for (const voter of voters) {
    const token = crypto.randomBytes(24).toString('hex');
    const pin = String(Math.floor(1000 + Math.random() * 9000)); // 4-digit
    const pinHash = await bcrypt.hash(pin, 10);

    // Save to Supabase
    const { error } = await supabase.from('voters').upsert({
      student_id: voter.student_id,
      full_name: voter.full_name,
      first_name: voter.first_name,
      middle_name: voter.middle_name,
      last_name: voter.last_name,
      course: voter.course,
      year_level: voter.year_level,
      pin_hash: pinHash,
      qr_token: token,
    }, { onConflict: 'student_id' });

    if (error) {
      console.error(`Error saving ${voter.student_id}:`, error);
      continue;
    }

    // Generate QR image
    await QRCode.toFile(`./qr-output/${voter.student_id}.png`, token, {
      width: 400,
      margin: 2,
      color: { dark: '#2C2416', light: '#FDFAF5' }, // matches design palette
    });

    output.push({ student_id: voter.student_id, full_name: voter.full_name, pin });
    console.log(`Generated: ${voter.student_id}`);
  }

  // One-time export of plain PINs (for Messenger distribution, then delete this file)
  fs.writeFileSync('tokens-and-pins.csv', stringify(output, { header: true }));
  console.log('Done. Send QR images + PINs to students via Messenger, then delete tokens-and-pins.csv.');
}

run();
