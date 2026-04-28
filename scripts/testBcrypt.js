const bcrypt = require('bcryptjs');

const hash1 = '$2a$12$FPOpHTCjibL0xDVd9bPn2uvpzgjIn8Dl5OTXFr47v0c9L8Hpk4JAm';

const hash2 = bcrypt.hashSync('demo123', 12);
console.log('Saved hash:', hash1);
console.log('Fresh hash:', hash2);

bcrypt.compare('demo123', hash1).then(r => console.log('Match saved:', r));
bcrypt.compare('demo123', hash2).then(r => console.log('Match fresh:', r));