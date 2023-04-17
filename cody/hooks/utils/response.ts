export const overrideFileDetails = (file: string): string[] => {
    return [
        `Should I override file %c${file}? %cAny changes made, will be lost! Reply with %cyes|No`,
        'font-weight: bold; color: #653a12',
        'font-weight: normal; color: #653a12',
        'background-color: rgba(251, 159, 75, 0.2)'
    ];
}
