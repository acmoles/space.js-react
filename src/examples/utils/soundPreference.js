export function getStoredSound() {
    const sound = localStorage.getItem('sound');

    if (!sound || sound === 'undefined') {
        return true;
    }

    try {
        const parsed = JSON.parse(sound);

        return typeof parsed === 'boolean' ? parsed : true;
    } catch {
        return true;
    }
}

export function setStoredSound(sound) {
    if (typeof sound === 'boolean') {
        localStorage.setItem('sound', JSON.stringify(sound));
    }
}
