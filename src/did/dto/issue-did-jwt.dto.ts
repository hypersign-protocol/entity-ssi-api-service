import { ApiProperty } from "@nestjs/swagger";
import { IsInt, isNotEmpty, IsNotEmpty, IsNotEmptyObject, isNotEmptyObject, IsObject, IsString, Max, Min } from "class-validator";
import { ValidateVerificationMethodId } from "src/utils/customDecorator/vmId.decorator";

export class IssueDidJwtDto {
    @ApiProperty({
        description: 'Verification method ID used to sign the JWT',
        example: 'did:hid:z6MkmEFC8N1AUsinEBNSszXoepHb45p38ZwidV58r1HPqCkU#key-1',
    })
    @IsString()
    @IsNotEmpty()
    @ValidateVerificationMethodId()
    verificationmethodId: string;
    @ApiProperty({
        description: 'Intended audience of the JWT (API or service identifier)',
        example: 'api.cavach.hypersign.id',
    })
    @IsString()
    @IsNotEmpty()
    audience: string;
    @ApiProperty({
        description: 'Custom claims to be signed in the JWT payload (validated and allow-listed by server)',
        example: { name: "xyz", email: "xyz@gmail.com" },
    })
    @IsObject()
    @IsNotEmptyObject()
    claims: Record<string, unknown>;
    @ApiProperty({
        description: 'JWT validity duration in seconds',
        example: 3600,
        minimum: 60,
        maximum: 86400,
    })
    @IsInt()
    @Min(60)
    @Max(60 * 60 * 24)
    ttlSeconds: number


}

export class IssueDidJwtResponseDto {
    @ApiProperty({
        description: 'DID signed JWT',
        example:
            'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhcGkuY2F2YWNoLmh5cGVyc2lnbi5pZCIsImlzcyI6ImRpZDpoaWQ6ejZNa21FRkM4TjFBVXNpbkVCTlNzelhvZXBIYjQ1cDM4WndpZFY1OHIxSFBxQ2tVIiwiaWF0IjoxNzcwMjkxNTM1LCJleHAiOjE3NzAyOTUxMzV9.XYZ',
    })
    accessToken: string;
    @ApiProperty({
        description: 'Token expiry time in seconds',
        example: 3600,
    })
    expiresIn: number

}