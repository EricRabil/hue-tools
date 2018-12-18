export function collapse<T>(arr: T[][]): T[] {
    let parentArr: T[] = [];

    for (let subArr of arr) {
        parentArr = parentArr.concat(subArr);
    }

    return parentArr;
}