// Shared per-app animation flags. Reset on scene mount so a StrictMode
// re-mount or route re-entry starts from the original defaults.
export const params = {
    animate: true
};

export function resetParams() {
    params.animate = true;
}
