const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testBackend() {
  console.log('Testing backend endpoints...\n');

  try {
    // Test habits endpoint
    console.log('1. Testing habits endpoint...');
    const habitsResponse = await fetch(`${BASE_URL}/habits`);
    const habits = await habitsResponse.json();
    console.log('✅ Habits endpoint working:', habits.length, 'habits found');

    // Test pomodoro endpoint
    console.log('\n2. Testing pomodoro endpoint...');
    const pomodoroResponse = await fetch(`${BASE_URL}/pomodoro`);
    const pomodoros = await pomodoroResponse.json();
    console.log('✅ Pomodoro endpoint working:', pomodoros.length, 'sessions found');

    // Test calendar endpoint
    console.log('\n3. Testing calendar endpoint...');
    const calendarResponse = await fetch(`${BASE_URL}/calendar`);
    const calendar = await calendarResponse.json();
    console.log('✅ Calendar endpoint working:', calendar);

    // Test stats endpoint
    console.log('\n4. Testing stats endpoint...');
    const statsResponse = await fetch(`${BASE_URL}/stats`);
    const stats = await statsResponse.json();
    console.log('✅ Stats endpoint working:', stats);

    console.log('\n🎉 All endpoints are working correctly!');

  } catch (error) {
    console.error('❌ Error testing backend:', error.message);
  }
}

testBackend(); 