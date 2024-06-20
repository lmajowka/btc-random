import CoinKey from 'coinkey';
import walletsArray from './wallets.js';
import chalk from 'chalk';
import fs from 'fs/promises'; // Use fs/promises para operações assíncronas de arquivo
import crypto from 'crypto';
import bs58 from 'bs58';// otmizar as chaves unicas randoms

const walletsSet = new Set(walletsArray);

async function encontrarBitcoins(key, min, max, shouldStop, rand = 0) {
    let segundos = 0;
    let pkey = 0n;
    let chavesArray = new Set(); // conjunto único para verificar chaves repetidas
    let chavesArray10s = new Set(); // conjunto único para verificar chaves repetidas
    const chavesUnicasFilePath = 'chavesUnicasRandom.txt';

    // Ler o arquivo chavesUnicasRandom.txt e salvar no set chavesArray de forma assíncrona - TALVEZ CRIAR UMA API PARA TODOS OS USUARIOS SALVAREM AS KEYS Unicas?
    try {
        console.log("\nLendo arquivo de chaves random's salvas...\n");
        const data = await fs.readFile(chavesUnicasFilePath, 'utf8');
        const chaves = data.split('\n').filter(Boolean); // Filtra linhas vazias
        chaves.forEach(chave => chavesArray.add(chave));
    } catch (error) {
        if (error.code === 'ENOENT') {
        console.log('Arquivo chavesUnicasRandom.txt não encontrado. Criando um novo arquivo...');
        // Inicializa o arquivo com conteúdo vazio
        await fs.writeFile(chavesUnicasFilePath, '', 'utf8');
        } else {
            console.error('Erro ao ler o arquivo chavesUnicasRandom.txt:', error);
        }
    }   

    const um = rand === 0 ? 0n : BigInt(rand); // precisa estar 0 caso seja opção 1 - se deixar 1 pula para próxima key

    const startTime = Date.now();
    let keysInLast10Seconds = 0n;
    let keysInLastFull = 0n;
    const zeroes = Array.from({ length: 65 }, (_, i) => '0'.repeat(64 - i));

    console.log('Resumo: ');
    console.log('Buscando Bitcoins...');

    key = getRandomBigInt(min, max);
    let running = true;


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
                await fs.access(filePathKeys);
                await fs.appendFile(filePathKeys, lineToAppend, 'utf8');
                console.log(`Private key e WIF salvos no arquivo: ${filePathKeys}`);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    console.log(`Arquivo ${filePathKeys} não encontrado. Criando um novo arquivo...`);
                    const initialContent = `Chaves encontradas:\n`;
                    await fs.writeFile(filePathKeys, initialContent, 'utf8');
                    await fs.appendFile(filePathKeys, lineToAppend, 'utf8');
                    console.log(`Private key e WIF salvos no arquivo: ${filePathKeys}`);
                } else {
                    console.error(`Erro ao acessar o arquivo ${filePathKeys}:`, error);
                }
            }

            const uniqueKeysContent = Array.from(chavesArray10s).join('\n');
            await fs.appendFile(chavesUnicasFilePath,`\n${uniqueKeysContent}`, 'utf8');

            running = false;
            return;
        }
    }

    const executeLoop = async () => {
        while (running && !shouldStop()) {
            key += um;
            pkey = key.toString(16);
            pkey = `${zeroes[pkey.length]}${pkey}`;


            await achou(pkey);
            const base58Key = bs58.encode(Buffer.from(pkey, 'hex'));
            if (!chavesArray.has(base58Key)) {// aqui verifico todas as chaves
                chavesArray.add(base58Key);
                chavesArray10s.add(base58Key); // salvo as chaves que rodou apos 10segundos
                keysInLastFull += 1n;
            } else {                
                await achou(pkey,chavesArray10s);  // Verifica novamente, para gerar nova chave logo em seguinte
                key = getRandomBigInt(min, max);
                continue;
            }

            if (Date.now() - startTime > segundos) {
                segundos += 1000;
                console.log(segundos / 1000);
                if (segundos % 10000 === 0) {
                    const tempo = (Date.now() - startTime) / 1000;
                    console.clear();
                    console.log('Resumo: ');
                    console.log('Tempo em hash total: ', arrerondar(keysInLastFull.toString()/segundos),'total/10segundos')
                    console.log('Total de chaves buscadas:',arrerondar(keysInLastFull.toString()));
                    console.log('Chaves buscadas em 10 segundos:', chavesArray10s.size,'- quanto maior melhor');
                    
                    
                    console.log('Ultima chave tentada:', pkey); 
                    const filePath = 'Ultima_chave.txt';
                    const content = `Última chave tentada: ${pkey}`;

                    try {
                        await fs.writeFile(filePath, content, 'utf8');
                    } catch (error) {
                        if (error.code === 'ENOENT') {
                            console.log(`Arquivo ${filePath} não encontrado. Criando um novo arquivo...`);
                            // Inicializa o arquivo com conteúdo
                            await fs.writeFile(filePath, content, 'utf8');
                        } else {
                            console.error(`Erro ao escrever no arquivo ${filePath}:`, error);
                        }
                    }



                    const uniqueKeysContent = Array.from(chavesArray10s).join('\n');
                    await fs.appendFile(chavesUnicasFilePath,`\n${uniqueKeysContent}`, 'utf8'); // salvo apenas as chaves buscas pelo time de segundos, pois o sistema fica xiando o salvamento do \n
                
                    
                    chavesArray10s.clear();

                    key = getRandomBigInt(min, max);

                    if (key >= max) {
                        key = min;
                    }


                }


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
