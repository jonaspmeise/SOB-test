export function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export function slotToChessNotation(slotId) {
    const parts = slotId.split('-');
    if (parts.length === 3) {
        const row = parseInt(parts[1]);
        const col = parseInt(parts[2]);
        const columns = ['a', 'b', 'c', 'd', 'e'];
        const rows = ['4', '3', '2', '1'];
        return columns[col] + rows[row];
    }
    return "unknown";
}
