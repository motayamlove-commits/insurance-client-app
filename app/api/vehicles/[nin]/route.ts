import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nin: string }> }
) {
  const { nin } = await params;

  if (!nin || !/^\d{10}$/.test(nin)) {
    return NextResponse.json(
      { success: false, message: "Invalid NIN", vehicles: [] },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://bcare.com.sa/InquiryApi/api/InquiryNew/getVehiclesByNin?Nin=${encodeURIComponent(nin)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "ar-SA",
          Authorization: "Bearer 0.35989928665161711!!",
          Channel: "mobile",
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    const inner = data?.data || data;

    if (inner?.ErrorCode && inner.ErrorCode !== 0) {
      return NextResponse.json({
        success: false,
        message: inner.ErrorDescription || "API error",
        errorCode: inner.ErrorCode,
        vehicles: [],
      });
    }

    const result = inner?.Result;
    const vehicles = Array.isArray(result)
      ? result
      : result
        ? [result]
        : [];

    return NextResponse.json({
      success: true,
      vehicles,
    });
  } catch (error: any) {
    console.error("bcare API error:", error.message);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to connect to bcare API",
        vehicles: [],
      },
      { status: 500 }
    );
  }
}
