export const setPath = (obj : any, path: string, val: any) => { 
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const lastObj = keys.reduce((obj, key) => 
        obj[key] = obj[key] || {}, 
        obj); 
    lastObj[lastKey] = val;
};