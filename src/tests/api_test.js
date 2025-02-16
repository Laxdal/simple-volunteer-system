const fetch = require('node-fetch');

async function testAPI() {
    try {
        // 测试注册
        const registerResponse = await fetch('http://192.168.1.101:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'testuser' + Date.now(),
                password: 'password123',
                name: '测试用户'
            })
        });
        console.log('注册响应:', await registerResponse.json());

        // 测试登录
        const loginResponse = await fetch('http://192.168.1.101:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'testuser',
                password: 'password123'
            })
        });
        console.log('登录响应:', await loginResponse.json());
    } catch (error) {
        console.error('测试失败:', error);
    }
}

testAPI(); 