import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

// Characters a filename may not contain on Windows. Kept as a plain string so
// the check below stays readable next to the control-character test.
const FORBIDDEN_NAME_CHARACTERS = '<>:"|?*';

export class FileStorageService {
    /**
     * Reduces a client-supplied filename to something safe to join onto a
     * directory path.
     *
     * `file.originalname` arrives verbatim from the browser's multipart body,
     * so it can carry path separators: joining "../../secret.txt" onto the
     * upload directory writes outside it. Keeping only the last segment is what
     * actually stops that — a leftover ".." with no separator left in it is an
     * ordinary filename, not a traversal.
     *
     * Characters are filtered rather than allow-listed so that a Vietnamese
     * filename survives intact; an allow-list of A-Z would replace most of it
     * with underscores.
     */
    private safeFileName(originalName: string): string {
        const lastSegment = originalName.split(/[\\/]/).pop() ?? "";

        const cleaned = Array.from(lastSegment)
            // `char >= " "` drops every control character, since they all sort
            // below the space.
            .filter((char) => char >= " " && !FORBIDDEN_NAME_CHARACTERS.includes(char))
            .join("")
            .trim();

        // Leave room for the uuid prefix inside the filesystem's name limit.
        const shortened = cleaned.slice(0, 100);

        return shortened.length > 0 ? shortened : "file";
    }

    /**
     * Saves a CV file to the uploads/resumes directory.
     * @param file The uploaded CV file.
     * @returns The relative URL of the saved file.
     */
    public async saveCv(file: Express.Multer.File): Promise<string> {
        const uploadDir = path.resolve("uploads/resumes");
        await fs.mkdir(uploadDir, { recursive: true });

        // Generate unique file name and store its path
        const storedFileName = `${randomUUID()}-${this.safeFileName(file.originalname)}`;
        const storedFilePath = path.join(uploadDir, storedFileName);

        // Write the file to the file system
        await fs.writeFile(storedFilePath, file.buffer);

        // Return the file path as a URL
        return `/uploads/resumes/${storedFileName}`;
    }

    /**
     * Saves an avatar file to the uploads/avatars directory.
     * @param avatar The uploaded avatar file.
     * @returns The relative URL of the saved file.
     */
    public async saveAvatar(avatar: Express.Multer.File): Promise<string> {
        const uploadDir = path.resolve("uploads/avatars");
        await fs.mkdir(uploadDir, { recursive: true });

        // Generate unique file name and store its path
        const storedFileName = `${randomUUID()}-${this.safeFileName(avatar.originalname)}`;
        const storedFilePath = path.join(uploadDir, storedFileName);

        // Write the file to the file system
        await fs.writeFile(storedFilePath, avatar.buffer);

        // Return the file path as a URL
        return `/uploads/avatars/${storedFileName}`;
    }

    /**
     * Deletes a file from the disk based on its file URL.
     * @param fileUrl The URL of the file to delete (e.g. /upload/resumes/filename).
     */
    public async deleteFile(fileUrl: string): Promise<void> {
        if (!fileUrl) {
            return;
        }

        // Map URL back to file path
        // For example, if fileUrl is /upload/resumes/xxx or /upload/avatars/xxx
        // We map the prefix "/upload/" to "uploads/" relative to root directory.
        let relativePath = fileUrl;
        if (fileUrl.startsWith('/upload/')) {
            relativePath = fileUrl.replace(/^\/upload\//, 'uploads/');
        } else if (fileUrl.startsWith('/uploads/')) {
            relativePath = fileUrl.replace(/^\/uploads\//, 'uploads/');
        } else if (fileUrl.startsWith('upload/')) {
            relativePath = fileUrl.replace(/^upload\//, 'uploads/');
        } else if (fileUrl.startsWith('uploads/')) {
            relativePath = fileUrl;
        } else {
            // If it doesn't match any known upload prefix, don't attempt to delete to avoid security issues
            return;
        }

        const absolutePath = path.resolve(relativePath);

        // The prefix check above only says the stored value *looks* like an
        // upload path. This says the resolved result actually is one, so a row
        // holding ".." cannot unlink a file outside the upload directory.
        const uploadsRoot = path.resolve("uploads");
        if (!absolutePath.startsWith(uploadsRoot + path.sep)) {
            return;
        }

        try {
            // Check if file exists before trying to delete it
            await fs.access(absolutePath);
            await fs.unlink(absolutePath);
        } catch (error: any) {
            // If file doesn't exist, we don't need to throw an error
            // Otherwise, we log it or handle it as appropriate.
            console.error(`Failed to delete file at ${absolutePath}:`, error.message);
        }
    }
}
