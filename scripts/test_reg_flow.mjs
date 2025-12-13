const code = '1fb8871d-ae46-4f3e-b461-893a73d0db96';

async function run(){
  try{
    console.log('Fetching /r/<code> to see redirect...');
    const res = await fetch(`http://localhost:3000/r/${code}`, { redirect: 'manual' });
    console.log('status:', res.status);
    console.log('location:', res.headers.get('location'));

    console.log('\nNow following redirect to final URL...');
    const res2 = await fetch(`http://localhost:3000/r/${code}`);
    console.log('final url:', res2.url);
    console.log('final status:', res2.status);
    const text = await res2.text();
    console.log('body length:', text.length);
  }catch(err){
    console.error(err);
    process.exit(1);
  }
}

run();
