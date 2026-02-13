const testSettings = async () => {
    try {
        console.log('Testing GET /api/settings...');
        const res1 = await fetch('http://localhost:5000/api/settings');
        const data1 = await res1.json();
        console.log('Current settings:', data1);

        console.log('\nTesting POST /api/settings...');
        const newValue = "Mensagem de teste " + Date.now();
        const resPost = await fetch('http://localhost:5000/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                key: 'FOLLOWUP_MSG',
                value: newValue
            })
        });
        
        if (!resPost.ok) throw new Error('POST failed');
        console.log('Updated FOLLOWUP_MSG to:', newValue);

        console.log('\nVerifying update...');
        const res2 = await fetch('http://localhost:5000/api/settings');
        const data2 = await res2.json();
        console.log('New settings:', data2);

        if (data2.FOLLOWUP_MSG === newValue) {
            console.log('\n✅ SUCCESS: Settings updated correctly!');
        } else {
            console.log('\n❌ FAILURE: Settings did not update.');
        }

    } catch (error) {
        console.error('Test failed:', error.message);
    }
};

testSettings();
