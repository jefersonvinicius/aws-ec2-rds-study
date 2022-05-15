import express from 'express';
import pg from 'pg';
import dotenv from 'dotenv';
import os from 'os';

class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.birthDate = data.birthDate;
    this.salary = data.salary;
  }

  get age() {
    const time = Date.now() - this.birthDate.getTime();
    return Math.floor(time / (1000 * 60 * 60 * 24 * 365));
  }
}

class UserView {
  constructor(user) {
    this.user = user;
  }

  static makeMany(users) {
    return users.map((user) => new UserView(user));
  }

  toJSON() {
    return { ...this.user, age: this.user.age };
  }
}

class UserFactory {
  static makeFromDbRow(row) {
    return new User({
      id: row.id,
      name: row.name,
      birthDate: new Date(row.birth_date),
      salary: row.salary,
    });
  }

  static makeFromDbRows(rows) {
    return rows.map((r) => this.makeFromDbRow(r));
  }
}

dotenv.config();
const client = new pg.Client();
const app = express();

async function startDatabaseTables() {
  await client.query(`CREATE TABLE IF NOT EXISTS users (
    id serial primary key,
    name varchar(300) not null,
    birth_date timestamp not null,
    salary int not null
  )`);
}

app.use(express.json());

app.post('/users', async (request, response) => {
  const { name, birthDate, salary } = request.body;
  const { rows } = await client.query(
    `insert into users(name, birth_date, salary) 
    values ($1, $2, $3) returning *`,
    [name, birthDate, salary]
  );
  const user = UserFactory.makeFromDbRow(rows[0]);
  return response.json({ user: new UserView(user) });
});

app.get('/users', async (request, response) => {
  const page = Number(request.query.page ?? '1');
  const perPage = Number(request.query.perPage ?? '10');
  const { rows } = await client.query(`select * from users limit $1 offset $2`, [perPage, perPage * (page - 1)]);
  const users = UserFactory.makeFromDbRows(rows);
  return response.json({ users: UserView.makeMany(users) });
});

app.get('/status', async (request, response) => {
  const memGB = os.totalmem() * (9.31 * Math.pow(10, -10));
  const machine = {
    platform: os.platform(),
    hostname: os.hostname(),
    ip: request.ip,
    numberOfCpus: os.cpus().length,
    cpuModel: os.cpus()[0].model,
    arch: os.arch(),
    type: os.type(),
    memory: `${memGB.toFixed(2)}GB'`,
  };

  const { rows } = await client.query(`
    select * from 
      (select setting::int "maxConnections" from pg_settings where name=$$max_connections$$) q1,
      (select count(*)::int "connections" from pg_stat_activity) q2,
      (select count(*)::int "tables" from information_schema.tables where table_schema = 'public') q3
  `);
  const database = { ...rows[0] };

  return response.json({ machine, database });
});

async function bootstrap() {
  await client.connect();
  await startDatabaseTables();
  app.listen(3000, () => console.log('Serving...'));
}

bootstrap();
