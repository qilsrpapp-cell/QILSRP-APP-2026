import express from 'express'
import cors from 'cors'
import knex from 'knex'
import knexConfig from './knexfile.js'

import authenticationRouter from './routes/authentication.js'
import userRouter from './routes/user.js'
import cohortRouter from './routes/cohort.js'
import conversationRouter from './routes/conversation.js'
import messageRouter from './routes/message.js'
import resourceRouter from './routes/resource.js'
import folderRouter from './routes/folder.js'
import eventRouter from './routes/event.js'

import morgan from 'morgan'
import swaggerUI from 'swagger-ui-express'
import swaggerDocument from './docs/openapi.json' with { type: 'json' }
import 'dotenv/config'

const app = express()
const port = 3000

morgan.token('res', (req, res) => {
  const headers = {}
  res.getHeaderNames().map(h => headers[h] = res.getHeader(h))
  return JSON.stringify(headers)
})

const db = knex(knexConfig)
app.use((req, res, next) => {
  req.db = db
  next()
})

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cors())
app.use(morgan('dev'))
app.use('/', swaggerUI.serve)
app.get('/', swaggerUI.setup(swaggerDocument))

app.use('/user', authenticationRouter, userRouter)
app.use('/cohort', cohortRouter)
app.use('/conversation', conversationRouter, messageRouter)
app.use('/resource', resourceRouter)
app.use('/folder', folderRouter)
app.use('/event', eventRouter)

// Error handling
app.use(function (err, req, res, next) {
  if (err.status == 500 || !err.status) {
    console.log("SERVER ERROR: " + err.message)
    res.status(500).json({ error: true, message: "A server error has occured" })

  }
  else {
    res.status(err.status || 500).json({ error: true, message: err.message })

  }
});

app.use((req, res, next) => {
  res.status(404).send("Not found");

});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});