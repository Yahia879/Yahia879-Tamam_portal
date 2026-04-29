import crypto from 'crypto';

// الطريقة المستخدمة في script إنشاء المدير (pbkdf2)
function hashPasswordPbkdf2(password, salt) {
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash;
}

// الطريقة المستخدمة في auth.ts (sha256)
function hashPasswordSha256(password, salt) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

const password = 'Admin@123456';
const salt = 'a9b8c29748f08b4dd4336d35f5af1f17';
const storedHash = 'c4a20eae6872e30effb8f7cda22bc8f34f98cf5ec54569a538bf9ad7d07ad38e8331f7e3b828476248ba529bde4d26380d67a850d18558b205d71ddec8010a64';

console.log('Stored hash:', storedHash);
console.log('pbkdf2 hash:', hashPasswordPbkdf2(password, salt));
console.log('sha256 hash:', hashPasswordSha256(password, salt));
console.log('Match pbkdf2:', hashPasswordPbkdf2(password, salt) === storedHash);
console.log('Match sha256:', hashPasswordSha256(password, salt) === storedHash);
