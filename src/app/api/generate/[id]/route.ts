import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const generationRequest = await prisma.generationRequest.findUnique({
      where: { id },
    });

    if (!generationRequest) {
      return NextResponse.json(
        { message: 'Request not found' },
        { status: 404 }
      );
    }

    if (generationRequest.status === 'completed' && generationRequest.result) {
      const result = JSON.parse(generationRequest.result);
      // Clean up params/result if needed to save space? No, maybe keep history.
      
      return NextResponse.json({
        status: generationRequest.status,
        result: result,
      });
    } else if (generationRequest.status === 'failed') {
      return NextResponse.json({
        status: generationRequest.status,
        error: generationRequest.error,
      });
    } else {
      // Pending or Processing
      // Calculate position in queue if pending
      let position = undefined;
      let estimatedTime = undefined;
      
      if (generationRequest.status === 'pending') {
         const count = await prisma.generationRequest.count({
            where: {
                status: 'pending',
                createdAt: {
                    lt: generationRequest.createdAt
                }
            }
         });
         position = count + 1;
         // Estimate: position * 10 seconds?
         estimatedTime = position * 10;
      }

      return NextResponse.json({
        status: generationRequest.status,
        position,
        estimatedTime
      });
    }

  } catch (error: any) {
    console.error('Error fetching request status:', error);
    return NextResponse.json(
      { message: 'Error fetching status', error: error.message },
      { status: 500 }
    );
  }
}
