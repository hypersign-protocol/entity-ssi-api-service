# Presentation Module Overview

This module manages presentation templates and provides APIs to create and verify verifiable presentations.

The template/request flow and the presentation create/verify flow are currently separate. Templates are stored in MongoDB and can be used to generate a presentation request object, but that request object is not persisted and is not later enforced by `POST /presentation` or `POST /presentation/verify`.

## Responsibilities

| Area | Responsibility | Persistence |
| --- | --- | --- |
| Presentation template | Stores reusable verifier requirements such as domain, name, and query | Stored in MongoDB |
| Presentation request | Builds a request object from a stored template, challenge, expiry, and callback URL | Not stored |
| Presentation creation | Creates and signs a verifiable presentation from submitted credentials and holder DID | Not stored |
| Presentation verification | Verifies the submitted signed presentation cryptographically | Not stored |

## Presentation Template

Endpoint:

```http
POST /api/v1/presentation/template
```

Creates a reusable verifier-side template.

The service stores the template with the authenticated app id:

```ts
{
  appId: appDetail.appId,
  domain,
  name,
  query
}
```

Before saving, it checks that `name` is unique for the same `appId`. Templates are app-scoped, so one app cannot fetch or modify another app's templates.

Template management endpoints:

```http
GET    /api/v1/presentation/template
GET    /api/v1/presentation/template/:templateId
PATCH  /api/v1/presentation/template/:templateId
DELETE /api/v1/presentation/template/:templateId
```

## Presentation Request

Endpoint:

```http
POST /api/v1/presentation/request
```

Creates a presentation request object from a stored template.

The service loads the template by:

```ts
{
  appId: appDetail.appId,
  _id: templateId
}
```

Then it adds the challenge to the template body and returns a request object. This response is not stored. There is no presentation request collection, no lookup by request id, and no lifecycle state for pending/completed requests.

## Presentation Creation

Endpoint:

```http
POST /api/v1/presentation
```

Creates and signs a verifiable presentation from the payload provided by the caller.

The service:

1. Generates an unsigned presentation using `HypersignVerifiablePresentation.generate()`.
2. Resolves the holder DID.
3. Selects the holder signing verification method using the provided `verificationMethodId`, or falls back to `didDocument.assertionMethod[0]`.
4. Confirms the holder DID belongs to the authenticated app through `DidRepository`.
5. Loads the holder mnemonic from the app vault.
6. Signs with BabyJubJub when the selected verification method type is `BabyJubJubKey2021`; otherwise signs with the standard Ed25519 path.

The signed presentation is returned directly and is not stored.

## Presentation Verification

Endpoint:

```http
POST /api/v1/presentation/verify
```

Verifies the signed presentation supplied in the request body.

The service extracts the holder DID, issuer DID, challenge, proof type, and domain from the presentation:

```ts
holderDid = presentation.holder
issuerDid = presentation.verifiableCredential[0].issuer
challenge = presentation.proof.challenge
type = presentation.proof.type
domain = presentation.proof.domain
```

If verification method ids are not provided, it defaults to:

```ts
holderVerificationMethodId = holderDid + '#key-1'
issuerVerificationMethodId = issuerDid + '#key-1'
```

For `BJJSignature2021`, verification uses `hypersignVP.bjjVp.verify()`. Other proof types use `hypersignVP.verify()`.

The verification result is returned directly and is not stored.

## Template/Request Linkage

The current implementation does not enforce a relationship between:

- a stored presentation template,
- a generated presentation request,
- a created verifiable presentation,
- and a verification call.

Specifically:

- `POST /presentation/request` returns a request object but does not persist it.
- `POST /presentation` does not accept `requestId` or `templateId`.
- `POST /presentation` does not load the original template.
- `POST /presentation` does not validate submitted credentials against the template query.
- `POST /presentation/verify` does not check whether a presentation request existed.
- `POST /presentation/verify` only verifies the cryptographic validity of the submitted presentation.

In practice, the caller is responsible for carrying values from the request into presentation creation, especially `challenge`, `domain`, and credential constraints.

If strict request enforcement is required, the system should persist presentation requests and link them during creation or verification. A typical design would store the request by `id`, then verify that the submitted presentation matches the original template query, challenge, domain, expiry time, expected holder/verifier DID, and trusted issuer constraints.

## API Examples

Use the service SSI OAuth access token as the bearer token.

```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

Do not commit real access tokens in examples or README files.

### 1. Create Presentation Template

Method:

```http
POST
```

URL:

```http
https://api.entity.hypersign.id/api/v1/presentation/template
```

Headers:

```json
{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "application/json"
}
```

Request body:

```json
{
  "domain": "fyre.hypersign.id",
  "name": "alumni_credential_request",
  "query": [
    {
      "type": "QueryByExample",
      "credentialQuery": [
        {
          "required": true,
          "reason": "We need you to prove your eligibility to work.",
          "example": {
            "@context": [
              "https://www.w3.org/2018/credentials/v1"
            ],
            "type": "AlumniCredential",
            "credentialSubject": {
              "name": "Random name",
              "id": "did:hid:z6MkrqDhuqTuTA3KDoKxvj3n6dL2xg35MtffXEVQw1VqHHT6"
            },
            "credentialSchema": {
              "id": "sch:hid:z6MkgizUGcE4xcMiAwY8LzDcF8DHPh9A9ok5aTiedaZB9Nn2:1.0",
              "type": "JsonSchemaValidator2018"
            },
            "trustedIssuer": [
              {
                "required": true,
                "issuer": "did:hid:z6Mkks3VU4BU6tRhmQoiDshfkHmgyoPuXuERaAosunQCXK64"
              }
            ]
          }
        }
      ]
    }
  ]
}
```

Response body:

```json
{
  "appId": "d1916725ed4c982693323602180bd83d1b7b",
  "domain": "fyre.hypersign.id",
  "query": [
    {
      "type": "QueryByExample",
      "credentialQuery": [
        {
          "required": true,
          "reason": "We need you to prove your eligibility to work.",
          "example": {
            "@context": [
              "https://www.w3.org/2018/credentials/v1"
            ],
            "type": "AlumniCredential",
            "credentialSubject": {
              "name": "Random name"
            },
            "credentialSchema": {
              "type": "JsonSchemaValidator2018"
            },
            "trustedIssuer": [
              {
                "required": true
              }
            ]
          }
        }
      ]
    }
  ],
  "name": "alumni_credential_request",
  "_id": "6a5869d5cd99e52c14c50c88",
  "__v": 0
}
```

### 2. Create Presentation Request

Method:

```http
POST
```

URL:

```http
https://api.entity.hypersign.id/api/v1/presentation/request
```

Headers:

```json
{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "application/json"
}
```

Request body:

```json
{
  "challenge": "skfdhldklgjh-gaghkdhgaskda-aisgkjheyi",
  "did": "did:hid:z6Mkks3VU4BU6tRhmQoiDshfkHmgyoPuXuERaAosunQCXK64",
  "templateId": "6a5869d5cd99e52c14c50c88",
  "expiresTime": 1794036546996,
  "callbackUrl": "https://fyre.hypersign.id"
}
```

Response body:

```json
{
  "id": "79f4336bef154f1b150b1b26d32fa3295e94",
  "from": "did:hid:z6Mkks3VU4BU6tRhmQoiDshfkHmgyoPuXuERaAosunQCXK64",
  "created_time": 1784179886679,
  "expires_time": 1794036546996,
  "reply_url": "https://fyre.hypersign.id",
  "reply_to": [
    "did:hid:z6Mkks3VU4BU6tRhmQoiDshfkHmgyoPuXuERaAosunQCXK64"
  ],
  "body": {
    "_id": "6a5869d5cd99e52c14c50c88",
    "appId": "d1916725ed4c982693323602180bd83d1b7b",
    "domain": "fyre.hypersign.id",
    "query": [
      {
        "type": "QueryByExample",
        "credentialQuery": [
          {
            "required": true,
            "reason": "We need you to prove your eligibility to work.",
            "example": {
              "@context": [
                "https://www.w3.org/2018/credentials/v1"
              ],
              "type": "AlumniCredential",
              "credentialSubject": {
                "name": "Random name"
              },
              "credentialSchema": {
                "type": "JsonSchemaValidator2018"
              },
              "trustedIssuer": [
                {
                  "required": true
                }
              ]
            }
          }
        ]
      }
    ],
    "name": "alumni_credential_request",
    "challenge": "skfdhldklgjh-gaghkdhgaskda-aisgkjheyi"
  }
}
```

### 3. Create Presentation

Method:

```http
POST
```

URL:

```http
https://api.entity.hypersign.id/api/v1/presentation
```

Headers:

```json
{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "application/json"
}
```

Request body:

```json
{
  "credentialDocuments": [
    {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://schema.org",
        "https://w3id.org/security/suites/bbs-2020/v1"
      ],
      "id": "vc:hid:z6MkgN6z8xExampleCredentialId",
      "type": [
        "ExampleCredential"
      ],
      "issuer": "did:hid:z6Mkks3VU4BU6tRhmQoiDshfkHmgyoPuXuERaAosunQCXK64",
      "issuanceDate": "2026-07-16T07:30:00.000Z",
      "expirationDate": "2027-07-16T07:30:00.000Z",
      "credentialSubject": {
        "id": "did:hid:z6MkrqDhuqTuTA3KDoKxvj3n6dL2xg35MtffXEVQw1VqHHT6",
        "name": "Alice",
        "role": "Holder"
      },
      "proof": {
        "type": "BJJSignature2021",
        "created": "2026-07-16T07:30:00Z",
        "verificationMethod": "did:hid:z6Mkks3VU4BU6tRhmQoiDshfkHmgyoPuXuERaAosunQCXK64#key-2",
        "proofPurpose": "assertionMethod",
        "proofValue": "zExampleCredentialProof"
      }
    }
  ],
  "holderDid": "did:hid:z6MkrqDhuqTuTA3KDoKxvj3n6dL2xg35MtffXEVQw1VqHHT6",
  "challenge": "skfdhldklgjh-gaghkdhgaskda-aisgkjheyi",
  "domain": "fyre.hypersign.id",
  "verificationMethodId": "did:hid:z6MkrqDhuqTuTA3KDoKxvj3n6dL2xg35MtffXEVQw1VqHHT6#key-2"
}
```

Response body:

```json
{
  "presentation": {
    "@context": [
      "https://www.w3.org/2018/credentials/v1"
    ],
    "type": [
      "VerifiablePresentation"
    ],
    "verifiableCredential": [
      {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://schema.org",
          "https://w3id.org/security/suites/bbs-2020/v1"
        ],
        "id": "vc:hid:z6MkgN6z8xExampleCredentialId",
        "type": [
          "ExampleCredential"
        ],
        "issuer": "did:hid:z6Mkks3VU4BU6tRhmQoiDshfkHmgyoPuXuERaAosunQCXK64",
        "credentialSubject": {
          "id": "did:hid:z6MkrqDhuqTuTA3KDoKxvj3n6dL2xg35MtffXEVQw1VqHHT6",
          "name": "Alice",
          "role": "Holder"
        },
        "proof": {
          "type": "BJJSignature2021",
          "verificationMethod": "did:hid:z6Mkks3VU4BU6tRhmQoiDshfkHmgyoPuXuERaAosunQCXK64#key-2",
          "proofPurpose": "assertionMethod",
          "proofValue": "zExampleCredentialProof"
        }
      }
    ],
    "id": "vp:hid:z6MkgPresentationId",
    "holder": "did:hid:z6MkrqDhuqTuTA3KDoKxvj3n6dL2xg35MtffXEVQw1VqHHT6",
    "proof": {
      "type": "BJJSignature2021",
      "created": "2026-07-16T07:31:00Z",
      "verificationMethod": "did:hid:z6MkrqDhuqTuTA3KDoKxvj3n6dL2xg35MtffXEVQw1VqHHT6#key-2",
      "proofPurpose": "authentication",
      "challenge": "skfdhldklgjh-gaghkdhgaskda-aisgkjheyi",
      "domain": "fyre.hypersign.id",
      "proofValue": "zExamplePresentationProof"
    }
  }
}
```

### 4. Verify Presentation

Method:

```http
POST
```

URL:

```http
https://api.entity.hypersign.id/api/v1/presentation/verify
```

Headers:

```json
{
  "Authorization": "Bearer <access_token>",
  "Content-Type": "application/json"
}
```

Request body:

```json
{
  "presentation": {
    "@context": [
      "https://www.w3.org/2018/credentials/v1"
    ],
    "type": [
      "VerifiablePresentation"
    ],
    "verifiableCredential": [
      {
        "id": "vc:hid:z6MkgN6z8xExampleCredentialId",
        "type": [
          "ExampleCredential"
        ],
        "issuer": "did:hid:z6Mkks3VU4BU6tRhmQoiDshfkHmgyoPuXuERaAosunQCXK64",
        "credentialSubject": {
          "id": "did:hid:z6MkrqDhuqTuTA3KDoKxvj3n6dL2xg35MtffXEVQw1VqHHT6",
          "name": "Alice",
          "role": "Holder"
        },
        "proof": {
          "type": "BJJSignature2021",
          "verificationMethod": "did:hid:z6Mkks3VU4BU6tRhmQoiDshfkHmgyoPuXuERaAosunQCXK64#key-2",
          "proofPurpose": "assertionMethod",
          "proofValue": "zExampleCredentialProof"
        }
      }
    ],
    "id": "vp:hid:z6MkgPresentationId",
    "holder": "did:hid:z6MkrqDhuqTuTA3KDoKxvj3n6dL2xg35MtffXEVQw1VqHHT6",
    "proof": {
      "type": "BJJSignature2021",
      "created": "2026-07-16T07:31:00Z",
      "verificationMethod": "did:hid:z6MkrqDhuqTuTA3KDoKxvj3n6dL2xg35MtffXEVQw1VqHHT6#key-2",
      "proofPurpose": "authentication",
      "challenge": "skfdhldklgjh-gaghkdhgaskda-aisgkjheyi",
      "domain": "fyre.hypersign.id",
      "proofValue": "zExamplePresentationProof"
    }
  },
  "holderVerificationMethodId": "did:hid:z6MkrqDhuqTuTA3KDoKxvj3n6dL2xg35MtffXEVQw1VqHHT6#key-2",
  "issuerVerificationMethodId": "did:hid:z6Mkks3VU4BU6tRhmQoiDshfkHmgyoPuXuERaAosunQCXK64#key-2"
}
```

Response body:

```json
{
  "verified": true,
  "results": [
    {
      "proof": {
        "type": "BJJSignature2021",
        "created": "2026-07-16T07:31:00Z",
        "verificationMethod": "did:hid:z6MkrqDhuqTuTA3KDoKxvj3n6dL2xg35MtffXEVQw1VqHHT6#key-2",
        "proofPurpose": "authentication"
      },
      "verified": true,
      "verificationMethod": {
        "id": "did:hid:z6MkrqDhuqTuTA3KDoKxvj3n6dL2xg35MtffXEVQw1VqHHT6#key-2",
        "type": "BabyJubJubKey2021",
        "controller": "did:hid:z6MkrqDhuqTuTA3KDoKxvj3n6dL2xg35MtffXEVQw1VqHHT6",
        "publicKeyMultibase": "zExampleHolderPublicKey"
      },
      "purposeResult": {
        "valid": true,
        "controller": {
          "@context": "https://w3id.org/security/v2",
          "id": "did:hid:z6MkrqDhuqTuTA3KDoKxvj3n6dL2xg35MtffXEVQw1VqHHT6",
          "assertionMethod": [
            "did:hid:z6MkrqDhuqTuTA3KDoKxvj3n6dL2xg35MtffXEVQw1VqHHT6#key-1",
            "did:hid:z6MkrqDhuqTuTA3KDoKxvj3n6dL2xg35MtffXEVQw1VqHHT6#key-2"
          ]
        }
      }
    }
  ]
}
```

## Actual API Relationship

There are two separate concerns in the current implementation.

The first concern is verifier-side request preparation:

```txt
POST /presentation/template
  Stores the verifier's credential requirements as a reusable template.

POST /presentation/request
  Reads that template and returns a request object containing challenge,
  expiry, callback URL, and the template body.
```

The second concern is cryptographic presentation handling:

```txt
POST /presentation
  Creates and signs a presentation from the credentialDocuments, holderDid,
  challenge, domain, and optional verificationMethodId supplied in the request.

POST /presentation/verify
  Verifies the signed presentation supplied in the request.
```

These two concerns are not connected by backend state today. The presentation request response is meant to be consumed by the caller or wallet, but the service does not persist that request and does not later require a `requestId` when creating or verifying a presentation.

So the caller must carry these values forward:

```txt
presentation request challenge -> POST /presentation challenge
presentation request domain    -> POST /presentation domain
template credential query      -> wallet/caller selects matching credentials
```

Verification checks the signed presentation cryptographically. It does not check whether the presentation satisfies the original template query unless that comparison is implemented separately.
