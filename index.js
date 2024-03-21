const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser')
const { JsonDB, Config } = require("node-json-db")
const { v4: uuidv4 } = require("uuid")
const { tExcercise, tLog, tLogInfo, tUser } = require("./model/temp")

const db = new JsonDB(new Config("database/myDatabase", true, false, "/"))

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// DB Name space
const _userDBPath = "/users"
const _userExercisePath = "/exercises"

// Functions
async function tryGetData(space) {
  try {
    const _db = await db.getData(space)
    return _db
  } catch {
    await db.push(space, [])
    const _db = await db.getData(space)
    return _db
  }
}

// [x] - POST: Add Users
// [x] - GET: Users
app.route("/api/users").post(async function (req, res) {
  const _userDB = await tryGetData(_userDBPath)
  const _data = req.body
  const _user = { ...tUser }

  if (!!!_data.username) return res.status(422).send({ error: "Username is missing" })

  _user.username = _data.username
  _user._id = uuidv4()

  await db.push(_userDBPath, [..._userDB, _user])
  return res.send(_user)
}).get(async function (req, res) {
  const _userDB = await tryGetData(_userDBPath)
  res.send(_userDB)
})
// POST: Excercise
app.route("/api/users/:_id/exercises").post(async function (req, res) {
  const _userDB = await tryGetData(_userDBPath)
  const _excerciseDB = await tryGetData(_userExercisePath)

  const _uid = req.params._id
  // description
  // duration
  // date? -> Default Current Date
  const _data = req.body

  // Find User First
  const _user = _userDB.find((_) => _._id === _uid)
  if (!!!_user) {
    console.log("User Not Found");
    return res.status(404).send({ error: "Not Found" })
  }

  // Form Data
  const formData = { ...tExcercise }
  formData._id = _user._id
  formData.username = _user.username
  formData.description = _data.description
  formData.duration = parseInt(_data.duration)
  formData.date = (!!!_data.date || _data.date.trim() == "") ? new Date().toDateString() : new Date(_data.date).toDateString()

  // Save Data
  await db.push(_userExercisePath, [..._excerciseDB, formData])

  // Response
  res.send(formData)
})

// GET: Logs
app.route("/api/users/:_id/logs").get(async function (req, res) {
  const _userDB = await tryGetData(_userDBPath)
  const _excerciseDB = await tryGetData(_userExercisePath)
  // Getting Params: [_id, from?, to?, limit?]
  // [from, to] format: yyyy-mm-dd
  const _uid = req.params._id
  let _from = req.query.from
  let _to = req.query.to
  const _limit = req.query.limit

  // Find User First
  const _user = _userDB.find((_) => _._id === _uid)
  if (!!!_user) return res.status(404).send({ error: "Not Found" })


  // Get User's Excercise
  let findAllExcercise = _excerciseDB.filter((_) => _._id === _user._id).map((_) => {
    const _t = { ...tLogInfo }

    _t.duration = _.duration
    _t.description = _.description
    _t.date = _.date

    return _t
  })

  // Impletement Critiera
  // Filter by Date
  if (!!_from && !!_to) {
    _from = new Date(_from)
    _to = new Date(_to)

    console.log("_from:", _from);
    console.log("_to:", _to);

    findAllExcercise.filter((_) => _from.getTime() <= (new Date(_.date)).getTime() <= _to.getTime())

  }

  // Filter by Limit
  if (!!_limit && !isNaN(parseInt(parseInt))) {
    findAllExcercise = findAllExcercise.splice(0, parseInt(_limit))
  }

  // Form Response
  const respTemp = { ...tLog }
  respTemp.username = _user.username
  respTemp.count = findAllExcercise.length
  respTemp._id = _user._id
  respTemp.log = findAllExcercise // Need Cut Some Keys

  console.log("-".repeat(33));
  console.log(req.path);
  console.log("_from", _from);
  console.log("_to", _to);
  console.log("_limit", _limit);
  console.log("respTemp:", respTemp);
  console.log("-".repeat(33));
  res.send(respTemp)

})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
