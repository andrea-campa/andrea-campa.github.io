function changeColor() {
    const root = document.documentElement;
    const currentTextColor = getComputedStyle(root).getPropertyValue('--text-color').trim();
    const newTextColor = currentTextColor === 'white' ? 'black' : 'white';
    const currentBgColor = getComputedStyle(root).getPropertyValue('--bg-color').trim();
    const newBgColor = currentBgColor === 'white' ? 'black' : 'white';

    root.style.setProperty('--text-color', newTextColor);
    root.style.setProperty('--bg-color', newBgColor);
}
