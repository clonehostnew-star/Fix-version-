'use server';

/**
 * @fileOverview Analyzes a bot's code for MongoDB connection details.
 *
 * - detectMongoDBConfig - A function that handles the MongoDB configuration detection process.
 * - DetectMongoDBConfigInput - The input type for the detectMongoDBConfig function.
 * - DetectMongoDBConfigOutput - The return type for the detectMongoDBConfig function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectMongoDBConfigInputSchema = z.object({
  packageJsonContent: z
    .string()
    .describe('The content of the bot project’s package.json file.'),
  envFileContent: z
    .string()
    .optional()
    .describe('The content of the bot project’s .env file, if it exists.'),
});
export type DetectMongoDBConfigInput = z.infer<typeof DetectMongoDBConfigInputSchema>;

const DetectMongoDBConfigOutputSchema = z.object({
  requiresMongoDB: z
    .boolean()
    .describe('Whether the bot appears to require a MongoDB database.'),
  connectionString: z
    .string()
    .optional()
    .describe('The MongoDB connection string found in the code, if any.'),
  cloudSetupSuggestion: z
    .string()
    .optional()
    .describe('A suggestion for setting up MongoDB in the cloud (e.g., MongoDB Atlas).'),
});
export type DetectMongoDBConfigOutput = z.infer<typeof DetectMongoDBConfigOutputSchema>;

export async function detectMongoDBConfig(input: DetectMongoDBConfigInput): Promise<DetectMongoDBConfigOutput> {
  return detectMongoDBConfigFlow(input);
}

const detectMongoDBConfigPrompt = ai.definePrompt({
  name: 'detectMongoDBConfigPrompt',
  input: {schema: DetectMongoDBConfigInputSchema},
  output: {schema: DetectMongoDBConfigOutputSchema},
  prompt: `You are an expert software analyst specializing in analyzing NodeJS bot configurations.

You will receive the contents of package.json and .env files of a bot.

Determine if the bot requires a MongoDB database connection.

If it does, extract the connection string if available, and suggest a cloud setup option like MongoDB Atlas.

package.json content: {{{packageJsonContent}}}
.env file content: {{{envFileContent}}}

Consider common packages like 'mongoose' or 'mongodb' when determining if MongoDB is required.

Ensure that the connectionString field is only populated if a connection string is explicitly found.
`,
});

const detectMongoDBConfigFlow = ai.defineFlow(
  {
    name: 'detectMongoDBConfigFlow',
    inputSchema: DetectMongoDBConfigInputSchema,
    outputSchema: DetectMongoDBConfigOutputSchema,
  },
  async (input: DetectMongoDBConfigInput) => {
    const {output} = await detectMongoDBConfigPrompt(input);
    return output!;
  }
);
