import { tool } from 'ai';
import { z } from 'zod';
import { getUserProfile, updateUserProfile } from '../../database/users';

export const profileManager = tool({
  description: 'Fetch, display, and update student profile information for application purposes. Use this to get current profile data, display it to student for confirmation, and update any changes they want to make.',
  parameters: z.object({
    payload: z.string().describe('JSON string containing action, userId, and optional updates')
  }),
  execute: async ({ payload }) => {
    try {
      console.log('[TOOL profile-manager] EXECUTING with payload:', payload);
      console.log('[TOOL profile-manager] Tool called successfully!');
      
      // Parse payload
      let action, userId, parsedUpdates;
      try {
        const data = JSON.parse(payload || '{}');
        action = data.action;
        userId = data.userId;
        parsedUpdates = data.updates;
      } catch (e) {
        return JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON in payload',
          message: 'The payload must be valid JSON with action, userId, and optional updates.' 
        });
      }
      
      console.log('[TOOL profile-manager]', { action, userId, hasUpdates: !!parsedUpdates });

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

        console.log('[TOOL profile-manager] Raw profile data:', JSON.stringify(profile, null, 2));
        console.log('[TOOL profile-manager] Personal info:', JSON.stringify(profile.profile.personal, null, 2));
        console.log('[TOOL profile-manager] Academic info:', JSON.stringify(profile.profile.academic, null, 2));

        // Create a user-friendly display of the profile with only available information
        const personalInfo = [];
        const mailingInfo = [];
        const academicInfo = [];

        // Personal Information
        const fullName = `${profile.profile.personal.firstName || ''} ${profile.profile.personal.middleName || ''} ${profile.profile.personal.lastName || ''}`.trim();
        if (fullName) personalInfo.push(`• Name: ${fullName}`);
        if (profile.profile.personal.dateOfBirth) personalInfo.push(`• Date of Birth: ${profile.profile.personal.dateOfBirth}`);
        if (profile.profile.personal.email) personalInfo.push(`• Email: ${profile.profile.personal.email}`);
        if (profile.profile.personal.phone) personalInfo.push(`• Phone: ${profile.profile.personal.phone}`);
        if (profile.profile.personal.gender) personalInfo.push(`• Gender: ${profile.profile.personal.gender}`);
        if (profile.profile.personal.pronouns) personalInfo.push(`• Pronouns: ${profile.profile.personal.pronouns}`);
        if (profile.profile.personal.birthCountry) personalInfo.push(`• Birth Country: ${profile.profile.personal.birthCountry}`);
        if (profile.profile.personal.citizenshipStatus) personalInfo.push(`• Citizenship Status: ${profile.profile.personal.citizenshipStatus}`);

        // Mailing Address
        if (profile.profile.personal.mailingAddress.street) mailingInfo.push(`• Street: ${profile.profile.personal.mailingAddress.street}`);
        if (profile.profile.personal.mailingAddress.city) mailingInfo.push(`• City: ${profile.profile.personal.mailingAddress.city}`);
        if (profile.profile.personal.mailingAddress.state) mailingInfo.push(`• State: ${profile.profile.personal.mailingAddress.state}`);
        if (profile.profile.personal.mailingAddress.zipCode) mailingInfo.push(`• ZIP Code: ${profile.profile.personal.mailingAddress.zipCode}`);
        if (profile.profile.personal.mailingAddress.country) mailingInfo.push(`• Country: ${profile.profile.personal.mailingAddress.country}`);

        // Academic Information
        if (profile.profile.academic.currentGPA) academicInfo.push(`• GPA: ${profile.profile.academic.currentGPA}/${profile.profile.academic.gpaScale || 4.0}`);
        if (profile.profile.academic.testScores.sat.total > 0) academicInfo.push(`• SAT Scores: Total: ${profile.profile.academic.testScores.sat.total}, Math: ${profile.profile.academic.testScores.sat.math}, Reading: ${profile.profile.academic.testScores.sat.reading}, Writing: ${profile.profile.academic.testScores.sat.writing}`);
        if (profile.profile.academic.testScores.act.composite > 0) academicInfo.push(`• ACT Scores: Composite: ${profile.profile.academic.testScores.act.composite}, Math: ${profile.profile.academic.testScores.act.math}, English: ${profile.profile.academic.testScores.act.english}, Reading: ${profile.profile.academic.testScores.act.reading}, Science: ${profile.profile.academic.testScores.act.science}`);
        if (profile.profile.academic.testScores.toefl > 0) academicInfo.push(`• TOEFL: ${profile.profile.academic.testScores.toefl}`);
        if (profile.profile.academic.testScores.ielts > 0) academicInfo.push(`• IELTS: ${profile.profile.academic.testScores.ielts}`);
        if (profile.profile.academic.testScores.gre.verbal > 0) academicInfo.push(`• GRE: Verbal: ${profile.profile.academic.testScores.gre.verbal}, Quantitative: ${profile.profile.academic.testScores.gre.quantitative}, Analytical: ${profile.profile.academic.testScores.gre.analytical}`);
        if (profile.profile.academic.testScores.gmat > 0) academicInfo.push(`• GMAT: ${profile.profile.academic.testScores.gmat}`);
        if (profile.profile.academic.transcript.fileName) academicInfo.push(`• Transcript: ${profile.profile.academic.transcript.fileName}`);

        const displayText = `
Available Information:

${personalInfo.length > 0 ? `Personal Information:\n${personalInfo.join('\n\n')}\n\n` : ''}
${mailingInfo.length > 0 ? `Mailing Address:\n${mailingInfo.join('\n\n')}\n\n` : ''}
${academicInfo.length > 0 ? `Academic Information:\n${academicInfo.join('\n\n')}\n\n` : ''}

${personalInfo.length === 0 && mailingInfo.length === 0 && academicInfo.length === 0 ? 'No profile information is currently available. Please provide your details.' : 'Please confirm if this information is correct, or let me know what you would like to update.'}
        `.trim();

        return JSON.stringify({ 
          success: true, 
          displayText,
          message: 'Profile displayed successfully'
        });

      } else if (action === 'update') {
        if (!parsedUpdates) {
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
        
        if (parsedUpdates.personal) {
          updateData.profile = {
            ...profile.profile,
            personal: {
              ...profile.profile.personal,
              ...parsedUpdates.personal,
              mailingAddress: {
                ...profile.profile.personal.mailingAddress,
                ...parsedUpdates.personal.mailingAddress
              }
            }
          };
        }

        if (parsedUpdates.academic) {
          updateData.profile = {
            ...updateData.profile || profile.profile,
            academic: {
              ...profile.profile.academic,
              ...parsedUpdates.academic,
              testScores: {
                ...profile.profile.academic.testScores,
                ...parsedUpdates.academic.testScores,
                sat: {
                  ...profile.profile.academic.testScores.sat,
                  ...parsedUpdates.academic.testScores?.sat
                },
                act: {
                  ...profile.profile.academic.testScores.act,
                  ...parsedUpdates.academic.testScores?.act
                },
                gre: {
                  ...profile.profile.academic.testScores.gre,
                  ...parsedUpdates.academic.testScores?.gre
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