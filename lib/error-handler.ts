import { NextResponse } from 'next/server';

export function handleDatabaseError(error: unknown, context: string = 'database operation') {
  const errorMsg = error instanceof Error ? error.message : String(error);
  console.error(`Error during ${context}:`, errorMsg);
  
  // Include the actual error message for client debugging
  return NextResponse.json(
    { 
      success: false, 
      error: errorMsg || `Database error during ${context}. Check server logs for details.`
    },
    { status: 500 }
  );
}
