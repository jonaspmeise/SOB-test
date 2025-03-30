export const log = (text, player = undefined, fancy = false) => {
    const log = document.getElementById('log');

    const entry = document.createElement('div');
    entry.classList.add('log-entry');
    if(player !== undefined) {
        entry.classList.add(`player${player.index + 1}`);
    }
    if(fancy) {
        entry.classList.add('log-entry-fancy');
    }
    entry.innerHTML = text;

    log.firstElementChild.insertAdjacentHTML("beforebegin", entry.outerHTML);
};


const preview = document.getElementById('card-preview');
export const showCardPreview = (card) => {
    preview.style.backgroundImage = getCardArtUrl(card);
    preview.style.display = 'block';
};
export const hideCardPreview = () => {
    preview.style.display = 'none';
};

export const resolveCardArt = (name) => `https://cdn.shardsofbeyond.com/rashid-test/${name.toLowerCase().replaceAll(/\W/g, '')}.png`;
export const getCardArtUrl = (card) => card === undefined ? null : `url('${resolveCardArt(card.Name)}')`;
export const getRawCardArtUrl = (card) => card === undefined ? null : `url('https://cdn.shardsofbeyond.com/rashid-test-artworks/${card.Artworks.default}')`;