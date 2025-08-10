import { tool } from 'ai';
import { z } from 'zod';
import { getUserProfile, updateUserProfile } from '../../database/users';

export const profileManager = tool({
  description: 'Fetch, display, and update student profile information for application purposes. Use this to get current profile data, display it to student for confirmation, and update any changes they want to make.',
  parameters: z.object({
    action: z.enum(['fetch', 'display', 'update']),
    userId: z.string(),
    updates: z.object({
      personal: z.object({
        firstName: z.string().optional(),
        middleName: z.string().optional(),
        lastName: z.string().optional(),
        dateOfBirth: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        mailingAddress: z.object({
          street: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zipCode: z.string().optional(),
          country: z.string().optional()
        }).optional(),
        gender: z.string().optional(),
        pronouns: z.string().optional(),
        birthCountry: z.string().optional(),
        citizenshipStatus: z.string().optional()
      }).optional(),
      academic: z.object({
        currentGPA: z.string().optional(),
        gpaScale: z.number().optional(),
        testScores: z.object({
          sat: z.object({
            total: z.number().optional(),
            math: z.number().optional(),
            reading: z.number().optional(),
            writing: z.number().optional()
          }).optional(),
          act: z.object({
            composite: z.number().optional(),
            math: z.number().optional(),
            english: z.number().optional(),
            reading: z.number().optional(),
            science: z.number().optional()
          }).optional(),
          toefl: z.number().optional(),
          ielts: z.number().optional(),
          gre: z.object({
            verbal: z.number().optional(),
            quantitative: z.number().optional(),
            analytical: z.number().optional()
          }).optional(),
          gmat: z.number().optional()
        }).optional()
      }).optional()
    }).optional()
  }),
  execute: async ({ action, userId, updates }) => {
    try {
      console.log('[TOOL profile-manager]', { action, userId, hasUpdates: !!updates });

      if (action === 'fetch') {
        const profile = await getUserProfile(userId);
        if (!profile) {
          return JSON.stringify({ 
            success: false, 
            error: 'Profile not found',
            message: 'No profile found for this user. Please complete your profile first.' 
          });
        }

        // Format profile for display
        const formattedProfile = {
          personal: {
            name: `${profile.profile.personal.firstName || ''} ${profile.profile.personal.middleName || ''} ${profile.profile.personal.lastName || ''}`.trim(),
            firstName: profile.profile.personal.firstName,
            middleName: profile.profile.personal.middleName,
            lastName: profile.profile.personal.lastName,
            dateOfBirth: profile.profile.personal.dateOfBirth,
            email: profile.profile.personal.email,
            phone: profile.profile.personal.phone,
            mailingAddress: profile.profile.personal.mailingAddress,
            gender: profile.profile.personal.gender,
            pronouns: profile.profile.personal.pronouns,
            birthCountry: profile.profile.personal.birthCountry,
            citizenshipStatus: profile.profile.personal.citizenshipStatus
          },
          academic: {
            gpa: `${profile.profile.academic.currentGPA}/${profile.profile.academic.gpaScale}`,
            currentGPA: profile.profile.academic.currentGPA,
            gpaScale: profile.profile.academic.gpaScale,
            testScores: profile.profile.academic.testScores,
            transcript: profile.profile.academic.transcript
          }
        };

        return JSON.stringify({ 
          success: true, 
          profile: formattedProfile,
          message: 'Profile fetched successfully'
        });

      } else if (action === 'display') {
        const profile = await getUserProfile(userId);
        if (!profile) {
          return JSON.stringify({ 
            success: false, 
            error: 'Profile not found',
            message: 'No profile found for this user.' 
          });
        }

        // Create a user-friendly display of the profile
        const displayText = `
**Personal Information:**
• **Name:** ${profile.profile.personal.firstName || 'Not provided'} ${profile.profile.personal.middleName || ''} ${profile.profile.personal.lastName || ''}
• **Date of Birth:** ${profile.profile.personal.dateOfBirth || 'Not provided'}
• **Email:** ${profile.profile.personal.email || 'Not provided'}
• **Phone:** ${profile.profile.personal.phone || 'Not provided'}
• **Gender:** ${profile.profile.personal.gender || 'Not provided'}
• **Pronouns:** ${profile.profile.personal.pronouns || 'Not provided'}
• **Birth Country:** ${profile.profile.personal.birthCountry || 'Not provided'}
• **Citizenship Status:** ${profile.profile.personal.citizenshipStatus || 'Not provided'}

**Mailing Address:**
• **Street:** ${profile.profile.personal.mailingAddress.street || 'Not provided'}
• **City:** ${profile.profile.personal.mailingAddress.city || 'Not provided'}
• **State:** ${profile.profile.personal.mailingAddress.state || 'Not provided'}
• **ZIP Code:** ${profile.profile.personal.mailingAddress.zipCode || 'Not provided'}
• **Country:** ${profile.profile.personal.mailingAddress.country || 'Not provided'}

**Academic Information:**
• **GPA:** ${profile.profile.academic.currentGPA || 'Not provided'}/${profile.profile.academic.gpaScale || 4.0}
• **SAT Scores:** ${profile.profile.academic.testScores.sat.total > 0 ? `Total: ${profile.profile.academic.testScores.sat.total}, Math: ${profile.profile.academic.testScores.sat.math}, Reading: ${profile.profile.academic.testScores.sat.reading}, Writing: ${profile.profile.academic.testScores.sat.writing}` : 'Not provided'}
• **ACT Scores:** ${profile.profile.academic.testScores.act.composite > 0 ? `Composite: ${profile.profile.academic.testScores.act.composite}, Math: ${profile.profile.academic.testScores.act.math}, English: ${profile.profile.academic.testScores.act.english}, Reading: ${profile.profile.academic.testScores.act.reading}, Science: ${profile.profile.academic.testScores.act.science}` : 'Not provided'}
• **TOEFL:** ${profile.profile.academic.testScores.toefl > 0 ? profile.profile.academic.testScores.toefl : 'Not provided'}
• **IELTS:** ${profile.profile.academic.testScores.ielts > 0 ? profile.profile.academic.testScores.ielts : 'Not provided'}
• **GRE:** ${profile.profile.academic.testScores.gre.verbal > 0 ? `Verbal: ${profile.profile.academic.testScores.gre.verbal}, Quantitative: ${profile.profile.academic.testScores.gre.quantitative}, Analytical: ${profile.profile.academic.testScores.gre.analytical}` : 'Not provided'}
• **GMAT:** ${profile.profile.academic.testScores.gmat > 0 ? profile.profile.academic.testScores.gmat : 'Not provided'}
• **Transcript:** ${profile.profile.academic.transcript.fileName || 'Not uploaded'}

Would you like to use this information for your application, or would you like to make any changes?
        `.trim();

        return JSON.stringify({ 
          success: true, 
          displayText,
          message: 'Profile displayed successfully'
        });

      } else if (action === 'update') {
        if (!updates) {
          return JSON.stringify({ 
            success: false, 
            error: 'No updates provided',
            message: 'Please provide the information you want to update.' 
          });
        }

        const profile = await getUserProfile(userId);
        if (!profile) {
          return JSON.stringify({ 
            success: false, 
            error: 'Profile not found',
            message: 'No profile found for this user.' 
          });
        }

        // Prepare updates
        const updateData: any = {};
        
        if (updates.personal) {
          updateData.profile = {
            ...profile.profile,
            personal: {
              ...profile.profile.personal,
              ...updates.personal,
              mailingAddress: {
                ...profile.profile.personal.mailingAddress,
                ...updates.personal.mailingAddress
              }
            }
          };
        }

        if (updates.academic) {
          updateData.profile = {
            ...updateData.profile || profile.profile,
            academic: {
              ...profile.profile.academic,
              ...updates.academic,
              testScores: {
                ...profile.profile.academic.testScores,
                ...updates.academic.testScores,
                sat: {
                  ...profile.profile.academic.testScores.sat,
                  ...updates.academic.testScores?.sat
                },
                act: {
                  ...profile.profile.academic.testScores.act,
                  ...updates.academic.testScores?.act
                },
                gre: {
                  ...profile.profile.academic.testScores.gre,
                  ...updates.academic.testScores?.gre
                }
              }
            }
          };
        }

        const updatedProfile = await updateUserProfile(userId, updateData);

        return JSON.stringify({ 
          success: true, 
          message: 'Profile updated successfully',
          profile: updatedProfile
        });

      } else {
        return JSON.stringify({ 
          success: false, 
          error: 'Invalid action',
          message: 'Please specify a valid action: fetch, display, or update.' 
        });
      }

    } catch (error: unknown) {
      console.error('[TOOL profile-manager] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      return JSON.stringify({ 
        success: false, 
        error: 'Internal error',
        message: `An error occurred while processing your request: ${message}` 
      });
    }
  }
}); 