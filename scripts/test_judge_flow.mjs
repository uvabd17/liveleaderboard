const token = 'e5b10383-357f-4a3f-be21-8b42163c6660';

async function run(){
  try{
    console.log('Calling validate...');
    let res = await fetch(`http://localhost:3000/api/judge/validate?token=${encodeURIComponent(token)}`);
    console.log('validate status:', res.status);
    try{console.log('validate body:', await res.json())}catch(e){console.log('validate body: non-json')}

    console.log('\nCalling accept (POST)...');
    res = await fetch('http://localhost:3000/api/judge/accept',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ token })
    });
    console.log('accept status:', res.status);
    try{console.log('accept body:', await res.json())}catch(e){console.log('accept body: non-json')}
  }catch(err){
    console.error(err);
    process.exit(1);
  }
}

run();
