db = db.getSiblingDB('admin');
db.auth('root', 'root');

db = db.getSiblingDB('booking-ticket');
db.createUser({
  user: 'user',
  pwd: 'password',
  roles: [
    {
      role: 'readWrite',
      db: 'booking-ticket',
    },
  ],
});
