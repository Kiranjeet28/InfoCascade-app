import { getJwtToken } from '../utils/auth-cache';

export interface ChatResponse {
    success: boolean;
    response?: string;
    code?: string;
    message?: string;
}

export const aiService = {
    async chat(message: string): Promise<string> {
        try {
            const token = await getJwtToken();
            const response = await fetch(`http://localhost:5000/api/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ message }),
            });

            const data: ChatResponse = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to get AI response');
            }

            return data.response || 'No response';
        } catch (error) {
            console.error('AI Service Error:', error);
            throw error;
        }
    },
};