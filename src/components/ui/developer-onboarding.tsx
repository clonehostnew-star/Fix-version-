'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bot, 
  Github, 
  Code, 
  Users, 
  Globe, 
  Star, 
  ArrowRight,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface DeveloperOnboardingProps {
  onComplete: () => void;
}

export function DeveloperOnboarding({ onComplete }: DeveloperOnboardingProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isDeveloper, setIsDeveloper] = useState<boolean | null>(null);
  const [wantsCollaborate, setWantsCollaborate] = useState<boolean | null>(null);
  const [wantsPublic, setWantsPublic] = useState<boolean | null>(null);

  const handleDeveloperChoice = (choice: boolean) => {
    setIsDeveloper(choice);
    if (choice) {
      setStep(2);
    } else {
      // Not a developer, skip to main site
      onComplete();
    }
  };

  const handleCollaborateChoice = (choice: boolean) => {
    setWantsCollaborate(choice);
    if (choice) {
      setStep(3);
    } else {
      // Doesn't want to collaborate, go to main site
      onComplete();
    }
  };

  const handlePublicChoice = (choice: boolean) => {
    setWantsPublic(choice);
    if (choice) {
      // Redirect to bot submission page
      router.push('/dashboard/submit-bot');
    } else {
      // Wants to collaborate but not make public, go to main site
      onComplete();
    }
  };

  const getStepIcon = (stepNumber: number, isCompleted: boolean) => {
    if (isCompleted) {
      return <CheckCircle className="w-6 h-6 text-green-500" />;
    }
    if (step === stepNumber) {
      return <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
        <span className="text-white text-sm font-bold">{stepNumber}</span>
      </div>;
    }
    return <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
      <span className="text-white text-sm font-bold">{stepNumber}</span>
    </div>;
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-white border-green-200 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mb-4">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-800">
            Welcome to WABOT TREE HOSTING! 🌳
          </CardTitle>
          <p className="text-green-600 mt-2">
            Let's get to know you better and see how we can grow together
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-6">
            {getStepIcon(1, step > 1)}
            <div className="w-8 h-px bg-gray-300"></div>
            {getStepIcon(2, step > 2)}
            <div className="w-8 h-px bg-gray-300"></div>
            {getStepIcon(3, step > 3)}
          </div>

          {/* Step 1: Are you a developer? */}
          {step === 1 && (
            <div className="text-center space-y-6">
              <div className="space-y-4">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Code className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">
                  Are you a WhatsApp Bot Developer?
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Do you create WhatsApp bots using Node.js, Python, or other programming languages?
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => handleDeveloperChoice(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
                >
                  <Code className="w-5 h-5 mr-2" />
                  Yes, I'm a Developer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDeveloperChoice(false)}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3 text-lg"
                >
                  <Users className="w-5 h-5 mr-2" />
                  No, I'm a User
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Want to collaborate? */}
          {step === 2 && (
            <div className="text-center space-y-6">
              <div className="space-y-4">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Globe className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">
                  Want to Collaborate with Our Community?
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Share your bot with other developers and users. Help grow the WhatsApp bot ecosystem!
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => handleCollaborateChoice(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
                >
                  <Globe className="w-5 h-5 mr-2" />
                  Yes, Let's Collaborate!
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleCollaborateChoice(false)}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3 text-lg"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  Maybe Later
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Make bot public? */}
          {step === 3 && (
            <div className="text-center space-y-6">
              <div className="space-y-4">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <Star className="w-10 h-10 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800">
                  Make Your Bot Public in the Marketplace?
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Showcase your bot to thousands of users. Get feedback, recognition, and help others discover amazing bots!
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                  <h4 className="font-semibold text-blue-800 mb-2">What you'll get:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Exposure to our growing community</li>
                    <li>• Feedback and suggestions from users</li>
                    <li>• Recognition for your development skills</li>
                    <li>• Potential collaboration opportunities</li>
                  </ul>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => handlePublicChoice(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-lg"
                >
                  <Star className="w-5 h-5 mr-2" />
                  Yes, Publish My Bot!
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePublicChoice(false)}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-3 text-lg"
                >
                  <XCircle className="w-5 h-5 mr-2" />
                  Keep It Private
                </Button>
              </div>
            </div>
          )}

          {/* Skip option */}
          <div className="text-center pt-4 border-t border-gray-200">
            <Button
              variant="ghost"
              onClick={onComplete}
              className="text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}