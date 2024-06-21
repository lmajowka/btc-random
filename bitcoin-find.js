import CoinKey from 'coinkey';
import walletsArray from './wallets.js';
import chalk from 'chalk';
import crypto from 'crypto';
import bs58 from 'bs58';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import Database from 'better-sqlite3';

const dbFilePath = './database.db';

const dbExists = fs.existsSync(dbFilePath);
const db = new Database(dbFilePath);
if (!dbExists) {
    db.prepare("CREATE TABLE IF NOT EXISTS privatekeys (id INTEGER PRIMARY KEY, key TEXT UNIQUE)").run();
}

const walletsSet = new Set(walletsArray);

async function encontrarBitcoins(key, min, max, shouldStop, rand = 0) {
    let segundos = 0;
    let pkey = 0n;
    let chavesArray10s = new Set();
    let chavesArray60s = new Set();  // Conjunto para inserção a cada 60 segundos
    let chavesArray10sBackup = new Set();

    const um = rand === 0 ? 0n : BigInt(rand);
    const startTime = Date.now();
    let keysInLastFull = 0n;
    const zeroes = Array.from({ length: 65 }, (_, i) => '0'.repeat(64 - i));

    console.log('Resumo: ');
    console.log('Buscando Bitcoins...');

    key = getRandomBigInt(min, max);
    let running = true;

    const keyExists = (key) => {
        const stmt = db.prepare("SELECT 1 FROM privatekeys WHERE key = ?");
        const row = stmt.get(key);
        return !!row;
    };

    const insertKeysInBatch = async (keys) => {
        const insert = db.prepare("INSERT INTO privatekeys (key) VALUES (?)");
        const insertMany = db.transaction((keys) => {
            for (const key of keys) {
                if (!keyExists(key)) {
                    try {
                        insert.run(key);
                    } catch (error) {
                        if (error.code === 'SQLITE_BUSY') {
                            // Não faça nada aqui, uma nova tentativa sera feita fora da função
                        }
                    }
                }
            }
        });

        let success = false;
        let retries = 0;
        while (!success && retries < 5) {
            try {
                insertMany(keys);
                success = true;
            } catch (error) {
                if (error.code === 'SQLITE_BUSY') {
                    retries += 1;
                    const backoffTime = Math.pow(2, retries) * 100;  // Exponential backoff
                    console.warn(`O banco de dados está ocupado, tentando novamente ${backoffTime}ms...`);
                    await new Promise(resolve => setTimeout(resolve, backoffTime));
                } else {
                    console.error('Erro inesperado ao inserir chaves:', error);
                    break;
                }
            }
        }

        if (!success) {
            console.error('Falha ao inserir chaves após várias tentativas.');
        }
    };

    async function achou(pkey) {
        const publicKey = generatePublic(pkey);

        if (walletsSet.has(publicKey)) {
            const tempo = (Date.now() - startTime) / 1000;
            const dataFormatada = new Date().toLocaleDateString();
            console.clear();
            console.log('Velocidade:', arrerondar(Number(key - min) / tempo), ' chaves por segundo - quanto menor melhor');
            console.log('Chaves buscadas no total:', keysInLastFull.toString());
            console.log('Tempo:', tempo, 'segundos');
            console.log('Private key:', chalk.green(pkey));
            console.log('WIF:', chalk.green(generateWIF(pkey)));

            const filePathKeys = 'keys.txt';
            const lineToAppend = `Private key: ${pkey}, WIF: ${generateWIF(pkey)} , Data: ${dataFormatada}\n`;

            try {
                await fsPromises.appendFile(filePathKeys, lineToAppend, 'utf8');
                console.log(`Private key e WIF salvos no arquivo: ${filePathKeys}`);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.log(`Arquivo ${filePathKeys} não encontrado. Criando um novo arquivo...`);
                    const initialContent = `Chaves encontradas:\n`;
                    await fsPromises.writeFile(filePathKeys, initialContent, 'utf8');
                    await fsPromises.appendFile(filePathKeys, lineToAppend, 'utf8');
                    console.log(`Private key e WIF salvos no arquivo: ${filePathKeys}`);
                } else {
                    console.error(`Erro ao acessar o arquivo ${filePathKeys}:`, error);
                }
            }

            running = false;
            return;
        }
    }

    let pkeyBackup = '';

    const executeLoop = async () => {
        while (running && !shouldStop()) {
            key += um;
            pkey = key.toString(16);
            pkey = `${zeroes[pkey.length]}${pkey}`;

            await achou(pkey);
            const base58Key = bs58.encode(Buffer.from(pkey, 'hex'));

            if (pkeyBackup === pkey || chavesArray10sBackup.has(base58Key) || keyExists(base58Key)) {
                await achou(pkey);// verifico pela questão da db.
                key = getRandomBigInt(min, max);
                continue;
            }

            chavesArray10s.add(base58Key);
            chavesArray60s.add(base58Key);  // cada 60s vai tentar salvar na DB
            keysInLastFull += 1n;

            if (Date.now() - startTime > segundos) {
                segundos += 1000;
                console.log(segundos / 1000);
                if (segundos % 10000 === 0) {
                    const tempo = (Date.now() - startTime) / 1000;
                    console.clear();
                    console.log('Resumo: ');
                    console.log('Total de chaves buscadas:', arrerondar(keysInLastFull.toString()));
                    console.log('Tempo em hash total:', arrerondar(keysInLastFull.toString() / segundos), '- total de chaves buscadas/' + (segundos/1000)+' segundos');
                    console.log('Chaves buscadas em 10 segundos:', chavesArray10s.size, '- quanto maior melhor');
                    console.log('Ultima chave tentada:', pkey);

                    const filePath = 'Ultima_chave.txt';
                    const content = `Última chave tentada: ${pkey}`;

                    try {
                        await fsPromises.writeFile(filePath, content, 'utf8');
                    } catch (error) {
                        if (error.code === 'ENOENT') {
                            console.log(`Arquivo ${filePath} não encontrado. Criando um novo arquivo...`);
                            await fsPromises.writeFile(filePath, content, 'utf8');
                        } else {
                            console.error(`Erro ao escrever no arquivo ${filePath}:`, error);
                        }
                    }

                    chavesArray10sBackup = new Set([...chavesArray10s]);
                    chavesArray10s.clear();
                    key = getRandomBigInt(min, max);

                    if (key >= max) {
                        key = min;
                    }
                }

                if (segundos % 30000 === 0) {  // Inserir a cada 30 segundos
                    console.log('Salvando no banco de dados...')
                    await insertKeysInBatch(chavesArray60s);
                    console.log('feito...')
                    chavesArray60s.clear();
                }
            }

            pkeyBackup = pkey;
            await new Promise(resolve => setImmediate(resolve));
        }
        chavesArray10sBackup.clear();
    };

    await executeLoop();
}

function generatePublic(privateKey) {
    const key = new CoinKey(Buffer.from(privateKey, 'hex'));
    key.compressed = true;
    return key.publicAddress;
}

function generateWIF(privateKey) {
    const key = new CoinKey(Buffer.from(privateKey, 'hex'));
    return key.privateWif;
}

function getRandomBigInt(min, max) {
    const range = max - min;
    const randomBigIntInRange = BigInt(`0x${crypto.randomBytes(32).toString('hex')}`) % range;
    return min + randomBigIntInRange;
}

function arrerondar(numero, casasDecimais = 2) {
    const [integerPart, fractionalPart = ''] = numero.toString().split('.');
    const adjustedFractional = fractionalPart.padEnd(casasDecimais, '0').slice(0, casasDecimais);
    const roundedNumber = integerPart + '.' + adjustedFractional;
    return parseFloat(roundedNumber);
}

export default encontrarBitcoins;
