// Simple Icons loader utility
window.SimpleIconsLoader = {
    getSimpleIcon(slug) {
        return window.simpleIcons?.getIcon(slug);
    },
    hasSimpleIcon(slug) {
        return window.simpleIcons?.hasIcon(slug);
    }
};
