import fs from 'fs'; // Use fs para operações síncronas de arquivo


import { promises as fsPromises } from 'fs'; // Use fs/promises para operações assíncronas de arquivo
import Database from 'better-sqlite3';
const dbFilePath = './database.db';


const dbExists = fs.existsSync(dbFilePath); // Verifica se o arquivo do banco de dados já existe
const db = new Database(dbFilePath); // Cria uma conexão com o banco de dados (cria o banco se não existir)

if (!dbExists) {
    console.log('Banco de dados não encontrado. Criando novo banco de dados...');   
    db.prepare("CREATE TABLE IF NOT EXISTS privatekeys (id INTEGER PRIMARY KEY, key TEXT UNIQUE)").run();  // Cria uma tabela com restrição de unicidade na coluna key
}

// Função para verificar se a chave privada já existe
const keyExists = (key) => {
    const stmt = db.prepare("SELECT 1 FROM privatekeys WHERE key = ?");
    const row = stmt.get(key);
    return !!row;
};

// Função para inserir uma chave privada ou um conjunto de chaves privadas
const insertKey = (key) => {
    if (key instanceof Set) {
        key.forEach(singleKey => {
            if (keyExists(singleKey)) {
                //console.log(`Erro: A chave ${singleKey} já existe.`);
            } else {
                const insert = db.prepare("INSERT INTO privatekeys (key) VALUES (?)");
                insert.run(singleKey);
                //console.log(`Chave ${singleKey} inserida com sucesso.`);
            }
        });
    } else {
        if (keyExists(key)) {
            //console.log(`Erro: A chave ${key} já existe.`);
        } else {
            const insert = db.prepare("INSERT INTO privatekeys (key) VALUES (?)");
            insert.run(key);
            //console.log(`Chave ${key} inserida com sucesso.`);
        }
    }
};

// Exemplo de uso com uma chave privada em Base58
const privateKeyBase58 = "5HueCGU8rMjx122VwNU5uJ8z";

// Exemplo de uso com um conjunto de chaves privadas em Base58
const privateKeySet = new Set([
    "5HueCGU8r123Mjx122VwNU5uJ8z",
    "5HueCGU8123rMjx122VwNU5uJ8z",
    "5HueCGU1238rMjx122VwNU5uJ8z"
]);

// Insere a chave privada única
//insertKey(privateKeyBase58);

// Insere o conjunto de chaves privadas
//insertKey(privateKeySet);



//keyExists(privateKeyBase58);
// Insere a chave privada
//insertKey(privateKeyBase58);

// Seleciona todas as chaves privadas
/*const select = db.prepare("SELECT count(id, key) FROM privatekeys");
const keys = select.all();
keys.forEach(key => {
    console.log(`Private Key ID: ${key.count}`);
});*/

const select = db.prepare("SELECT COUNT(*) AS count FROM privatekeys");
const result = select.get();
console.log(`Total de chaves privadas: ${result.count}`);

// Fecha a conexão
db.close();