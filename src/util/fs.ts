import fs from "fs-extra";
import path from "path";

/**
 * Flatten a directory into a single array of all files and sub-directories and sub-files
 * @param directory 
 */
export function flattenDirectory(directory: string) {
    let files = (fs.readdirSync(directory)).map(file => path.resolve(directory, file));

    files.forEach(async file => {
        const stat = await fs.stat(file);

        if (!stat.isDirectory()) return;

        files = files.concat(flattenDirectory(file));
    });

    return files;
}