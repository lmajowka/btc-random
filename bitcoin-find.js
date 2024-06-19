import CoinKey from 'coinkey';
import walletsArray from './wallets.js';
import chalk from 'chalk';
import fs from 'fs';
import crypto from 'crypto';

const walletsSet = new Set(walletsArray);

async function encontrarBitcoins(key, min, max, shouldStop, rand = 0) {
    console.clear();
    let segundos = 0;
    let pkey = 0n;

    let um = rand === 0 ? BigInt(0) : BigInt(rand);

    const startTime = Date.now();
    let keysInLast10Seconds = 0n;
    let keysInLastFull = 0n;
    const zeroes = Array.from({ length: 65 }, (_, i) => '0'.repeat(64 - i));


    console.log('Buscando Bitcoins...');

    key = getRandomBigInt(min, max);
    let running = true; // Variável de controle para a execução da função
    const executeLoop = async () => {
        while (running && !shouldStop()) {
            key += um;
            pkey = key.toString(16);
            pkey = `${zeroes[pkey.length]}${pkey}`;
            keysInLast10Seconds += 1n;
            keysInLastFull += 1n;
            

            if (Date.now() - startTime > segundos) {
                segundos += 1000;
                console.log(segundos / 1000);
                if (segundos % 10000 === 0) {
                    const tempo = (Date.now() - startTime) / 1000;
                    console.clear();
                    console.log('Resumo: ');
                    console.log('Tempo em hash total: ', arrerondar(keysInLastFull.toString()/segundos))
                    console.log('Total de chaves buscadas: ',arrerondar(keysInLastFull.toString()));
                    console.log('Chaves buscadas em 10 segundos:', arrerondar(keysInLast10Seconds.toString()),'- quanto maior melhor');
                    console.log('Ultima chave tentada:', pkey);

                    const filePath = 'Ultima_chave.txt';
                    const content = `Ultima chave tentada: ${pkey}`;
                    fs.writeFileSync(filePath, content, 'utf8');

                    key = getRandomBigInt(min, max);

                    if (key >= max) {
                        key = min;
                    }
                }
                keysInLast10Seconds = 0n;
            }

            const publicKey = generatePublic(pkey);
            if (walletsSet.has(publicKey)) {
                const tempo = (Date.now() - startTime) / 1000;
                console.clear();
                console.log('Velocidade:', arrerondar(Number(key - min) / tempo), ' chaves por segundo - quanto menor melhor');
                console.log('Chaves buscadas no total:', keysInLastFull.toString());
                console.log('Tempo:', tempo, 'segundos');
                console.log('Private key:', chalk.green(pkey));
                console.log('WIF:', chalk.green(generateWIF(pkey)));

                const filePath = 'keys.txt';
                const lineToAppend = `Private key: ${pkey}, WIF: ${generateWIF(pkey)}\n`;
                fs.appendFileSync(filePath, lineToAppend);
                console.log('Chave escrita no arquivo com sucesso.');
                running = false; // Define running para false para encerrar a execução
                return;  // Exit the function instead of throwing an error
            }

            await new Promise(resolve => setImmediate(resolve));  // Non-blocking loop
        }
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
