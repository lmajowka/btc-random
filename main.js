import ranges from './ranges.js'
import encontrarBitcoins from './bitcoin-find.js'
import walletsArray from './wallets.js';
import readline from 'readline'
import chalk from 'chalk'
import fs from 'fs'

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let shouldStop = false;

const walletsSet = new Set(walletsArray);

let key = 0;
let min, max = 0;
const FAVORITE_FILE = 'favorito.txt';
let loadedFromFavorite = false;

console.clear();
loadFavorite();

if (!loadedFromFavorite) {
console.log("\x1b[38;2;250;128;114m" + "╔════════════════════════════════════════════════════════╗\n" +
            "║" + "\x1b[0m" + "\x1b[36m" + "   ____ _____ ____   _____ ___ _   _ ____  _____ ____   " + "\x1b[0m" + "\x1b[38;2;250;128;114m" + "║\n" +
            "║" + "\x1b[0m" + "\x1b[36m" + "  | __ )_   _/ ___| |  ___|_ _| \\ | |  _ \\| ____|  _ \\  " + "\x1b[0m" + "\x1b[38;2;250;128;114m" + "║\n" +
            "║" + "\x1b[0m" + "\x1b[36m" + "  |  _ \\ | || |     | |_   | ||  \\| | | | |  _| | |_) | " + "\x1b[0m" + "\x1b[38;2;250;128;114m" + "║\n" +
            "║" + "\x1b[0m" + "\x1b[36m" + "  | |_) || || |___  |  _|  | || |\\  | |_| | |___|  _ <  " + "\x1b[0m" + "\x1b[38;2;250;128;114m" + "║\n" +
            "║" + "\x1b[0m" + "\x1b[36m" + "  |____/ |_| \\____| |_|   |___|_| \\_|____/|_____|_| \\_\\ " + "\x1b[0m" + "\x1b[38;2;250;128;114m" + "║\n" +
            "║" + "\x1b[0m" + "\x1b[36m" + "                                                        " + "\x1b[0m" + "\x1b[38;2;250;128;114m" + "║\n" +
            "╚══════════════════════\x1b[32m" + "Investidor Internacional - v0.4r" + "\x1b[0m\x1b[38;2;250;128;114m══╝" + "\x1b[0m");

    rl.question(`Escolha uma carteira puzzle( ${chalk.cyan(1)} - ${chalk.cyan(walletsSet.size)}): `, (answer) => {
        
        if (parseInt(answer) < 1 || parseInt(answer) > walletsSet.size) {
            console.log(chalk.bgRed('Erro: voce precisa escolher um numero entre 1 e',walletsSet.size))
        }

        min = ranges[answer-1].min
        max = ranges[answer-1].max


        console.log('Carteira escolhida: ', chalk.cyan(answer), ' Min: ', chalk.yellow(min), ' Max: ', chalk.yellow(max) )
        console.log('Numero possivel de chaves:',  chalk.yellow(parseInt(BigInt(max) - BigInt(min)).toLocaleString('pt-BR')))
        let status = ''
        if (ranges[answer-1].status == 1){
            status =  chalk.red('Encontrada')
        } else  {
            status =  chalk.green('Nao Encontrada')
        }
        console.log('Status: ', status)

        min = BigInt(min);
        max = BigInt(max);  
        key = BigInt(min);

        rl.question(`Escolha uma opcao (${chalk.cyan(1)} - Estou com sorte, ${chalk.cyan(2)} - Estou com sorte mas quero influencia-la ):`, (answer2) => {
            if (answer2 == '2'){
                rl.question('Escolha um numero entre 0 e 1.000.000.000: ', (answer3) => {
                    encontrarBitcoins(key, min, max, () => shouldStop,answer3)
                    rl.close();
                });
            } else {
                rl.question('Quer favoritar a sua escolha? (s/n):', (favoriteAnswer) => {
                    if (favoriteAnswer.toLowerCase() === 's') {
                        salvarFavorito(key, min, max,answer);
                        encontrarBitcoins(key, min, max, () => shouldStop);
                    }else{
                        encontrarBitcoins(key, min, max, () => shouldStop);
                    }

                    rl.close();
                });
            }
        })
    });

}

// Função para carregar a escolha favorita
function loadFavorite() {
    if (fs.existsSync(FAVORITE_FILE)) {
        const favoriteData = fs.readFileSync(FAVORITE_FILE, 'utf8').split('\n');
        let key = favoriteData[0];
        let min = favoriteData[1] || '';
        let max = favoriteData[2] || '';
        let ncarteira = favoriteData[3] || '';
        let minRanges = ranges[ncarteira-1].min;
        let maxRanges = ranges[ncarteira-1].max;
        min = BigInt(min);
        max = BigInt(max);  
        key = BigInt(key);

        console.log('Escolha feita usando o arquivo favorite.txt, caso não queira mais, apenas delete o arquivo.');
        console.log('Carteira escolhida: ', chalk.cyan(ncarteira), ' Min: ', chalk.yellow(minRanges), ' Max: ', chalk.yellow(maxRanges) )
        encontrarBitcoins(key, min, max, () => shouldStop)
        loadedFromFavorite = true;
    }
}

// Função para salvar a escolha favorita
function salvarFavorito(key, min, max, ncarteira) {
    fs.writeFileSync(FAVORITE_FILE, `${key}\n${min}\n${max}\n${ncarteira}`);
}


rl.on('SIGINT', () => {
    shouldStop = true;
    rl.close();
    process.exit();
});

process.on('SIGINT', () => {
    shouldStop = true;
    rl.close();
    process.exit();
});