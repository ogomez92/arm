export class ScreenshotService {
	static async processScreenshot(file: File): Promise<string> {
		return new Promise((resolve, reject) => {
			if (!file.type.startsWith('image/')) {
				reject(new Error('File must be an image'));
				return;
			}

			const reader = new FileReader();
			reader.onload = (e) => {
				const result = e.target?.result as string;
				resolve(result);
			};
			reader.onerror = () => reject(new Error('Error reading file'));
			reader.readAsDataURL(file);
		});
	}
}
