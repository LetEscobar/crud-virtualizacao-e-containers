const express = require('express')
const mysql = require('mysql2')
const bodyParser = require('body-parser')

const app = express()
const port = 3000

// Middleware para ler JSON no body das requisições
app.use(bodyParser.json())

let db

function connectToDatabase() {
    db = mysql.createConnection({
        host: 'db', // Nome do serviço do banco de dados no Docker Compose
        user: 'root',
        password: 'password',
        database: 'usersdb'
    })

    db.connect(err => {
        if (err) {
            console.error('Erro ao conectar ao MySQL:', err)
            setTimeout(connectToDatabase, 2000)
        } else {
            console.log('Conectado ao MySQL')
        }
    })

    db.on('error', err => {
        console.error('Erro de conexão MySQL:', err)
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            connectToDatabase()
        } else {
            throw err
        }
    })
}

connectToDatabase()

// Criar tabela se não existir
db.query(
    `
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255)
  )
`,
    err => {
        if (err) throw err
        console.log('Tabela de usuários pronta.')
    }
)

// Rota para criar um novo usuário
app.post('/users', (req, res) => {
    const { name, email } = req.body

    if (!name || !email) {
        return res.status(400).send('Nome e e-mail são obrigatórios')
    }

    db.query(
        'INSERT INTO users (name, email) VALUES (?, ?)',
        [name, email],
        (err, result) => {
            if (err) return res.status(500).send(err)
            res.status(201).send({ id: result.insertId, name, email })
        }
    )
})

// Rota para listar todos os usuários
app.get('/users', (req, res) => {
    db.query('SELECT * FROM users', (err, results) => {
        if (err) return res.status(500).send(err)
        res.status(200).json(results)
    })
})

// Rota para atualizar um usuário
app.put('/users/:id', (req, res) => {
    const { id } = req.params
    const { name, email } = req.body

    db.query(
        'UPDATE users SET name = ?, email = ? WHERE id = ?',
        [name, email, id],
        (err, result) => {
            if (err) return res.status(500).send(err)
            if (result.affectedRows === 0)
                return res.status(404).send('Usuário não encontrado')
            res.status(200).send('Usuário atualizado com sucesso')
        }
    )
})

// Rota para deletar um usuário
app.delete('/users/:id', (req, res) => {
    const { id } = req.params

    db.query('DELETE FROM users WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).send(err)
        if (result.affectedRows === 0)
            return res.status(404).send('Usuário não encontrado')
        res.status(200).send('Usuário deletado com sucesso')
    })
})

app.listen(port, () => {
    console.log(`App rodando em http://localhost:${port}`)
})
