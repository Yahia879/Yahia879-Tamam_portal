import axios from 'axios';

async function testLogin(payload) {
  try {
    const response = await axios.post('http://localhost:3000/api/trpc/auth.login', payload);
    console.log('Login Success with', JSON.stringify(payload), ':', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    if (error.response) {
      console.error('Login Failed with', JSON.stringify(payload), ':', error.response.status, JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    return false;
  }
}

async function run() {
  // Format 1: Direct JSON
  console.log('--- Trying Format 1 ---');
  await testLogin({
    email: 'admin@tamam.sa',
    password: 'Admin@123456'
  });

  // Format 2: SuperJSON format
  console.log('\n--- Trying Format 2 ---');
  await testLogin({
    json: {
      email: 'admin@tamam.sa',
      password: 'Admin@123456'
    }
  });

  // Format 3: Batched SuperJSON
  console.log('\n--- Trying Format 3 ---');
  await testLogin({
    '0': {
      json: {
        email: 'admin@tamam.sa',
        password: 'Admin@123456'
      }
    }
  });
}

run();
