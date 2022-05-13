import express from 'express'
import pg from 'pg'

const client = new pg.Client()

const app = express()

class User {
  constructor(data) {
    this.id = data.id
    this.name = data.name;
    this.birthDate = data.birthDate
    this.salary = date.salary;
  }
}

app.post('/users', (request, response) => {
  const {name, birthDate, salary} = request.body
  const row = await client.query()
})