import type { AgentContext } from '../../../../agent'
import type { CredentialFormatService } from '../CredentialFormatService'
import type {
  FormatAcceptOfferOptions,
  FormatAcceptProposalOptions,
  FormatAcceptRequestOptions,
  FormatAutoRespondOfferOptions,
  FormatAutoRespondProposalOptions,
  FormatAutoRespondRequestOptions,
  FormatCreateOfferOptions,
  FormatCreateOfferReturn,
  FormatCreateProposalOptions,
  FormatCreateProposalReturn,
  FormatCreateRequestOptions,
  CredentialFormatCreateReturn,
  FormatProcessCredentialOptions,
  FormatProcessOptions,
  FormatAutoRespondCredentialOptions,
} from '../CredentialFormatServiceOptions'
import type {
  JsonLdCredentialFormat,
  JsonCredential,
  JsonLdFormatDataCredentialDetail,
  JsonLdFormatDataVerifiableCredential,
} from './JsonLdCredentialFormat'

import { V1Attachment, V1AttachmentData } from '../../../../decorators/attachment/V1Attachment'
import { AriesFrameworkError } from '../../../../error'
import { JsonEncoder, areObjectsEqual } from '../../../../utils'
import { JsonTransformer } from '../../../../utils/JsonTransformer'
import { findVerificationMethodByKeyType } from '../../../dids/domain/DidDocument'
import { DidResolverService } from '../../../dids/services/DidResolverService'
import { W3cCredentialService } from '../../../vc'
import { W3cCredential, W3cVerifiableCredential } from '../../../vc/models'
import { CredentialFormatSpec } from '../../models/CredentialFormatSpec'

import { JsonLdCredentialDetail } from './JsonLdCredentialDetail'

const JSONLD_VC_DETAIL = 'aries/ld-proof-vc-detail@v1.0'
const JSONLD_VC = 'aries/ld-proof-vc@1.0'

export class JsonLdCredentialFormatService implements CredentialFormatService<JsonLdCredentialFormat> {
  public readonly formatKey = 'jsonld' as const
  public readonly credentialRecordType = 'w3c' as const

  /**
   * Create a {@link AttachmentFormats} object dependent on the message type.
   *
   * @param options The object containing all the options for the proposed credential
   * @returns object containing associated attachment, formats and filtersAttach elements
   *
   */
  public async createProposal(
    agentContext: AgentContext,
    { credentialFormats }: FormatCreateProposalOptions<JsonLdCredentialFormat>
  ): Promise<FormatCreateProposalReturn> {
    const format = new CredentialFormatSpec({
      format: JSONLD_VC_DETAIL,
    })

    const jsonLdFormat = credentialFormats.jsonld
    if (!jsonLdFormat) {
      throw new AriesFrameworkError('Missing jsonld payload in createProposal')
    }

    // this does the validation
    JsonTransformer.fromJSON(jsonLdFormat.credential, JsonLdCredentialDetail)

    // jsonLdFormat is now of type JsonLdFormatDataCredentialDetail
    const attachment = this.getFormatData(jsonLdFormat, format.attachId)
    return { format, attachment }
  }

  /**
   * Method called on reception of a propose credential message
   * @param options the options needed to accept the proposal
   */
  public async processProposal(agentContext: AgentContext, { attachment }: FormatProcessOptions): Promise<void> {
    const credProposalJson = attachment.getDataAsJson<JsonLdFormatDataCredentialDetail>()

    if (!credProposalJson) {
      throw new AriesFrameworkError('Missing jsonld credential proposal data payload')
    }

    // validation is done in here
    JsonTransformer.fromJSON(credProposalJson, JsonLdCredentialDetail)
  }

  public async acceptProposal(
    agentContext: AgentContext,
    { attachId, proposalAttachment }: FormatAcceptProposalOptions<JsonLdCredentialFormat>
  ): Promise<FormatCreateOfferReturn> {
    // if the offer has an attachment Id use that, otherwise the generated id of the formats object
    const format = new CredentialFormatSpec({
      attachId,
      format: JSONLD_VC_DETAIL,
    })

    const credentialProposal = proposalAttachment.getDataAsJson<JsonLdFormatDataCredentialDetail>()
    JsonTransformer.fromJSON(credentialProposal, JsonLdCredentialDetail)

    const offerData = credentialProposal

    const attachment = this.getFormatData(offerData, format.attachId)

    return { format, attachment }
  }

  /**
   * Create a {@link AttachmentFormats} object dependent on the message type.
   *
   * @param options The object containing all the options for the credential offer
   * @returns object containing associated attachment, formats and offersAttach elements
   *
   */
  public async createOffer(
    agentContext: AgentContext,
    { credentialFormats, attachId }: FormatCreateOfferOptions<JsonLdCredentialFormat>
  ): Promise<FormatCreateOfferReturn> {
    // if the offer has an attachment Id use that, otherwise the generated id of the formats object
    const format = new CredentialFormatSpec({
      attachId,
      format: JSONLD_VC_DETAIL,
    })

    const jsonLdFormat = credentialFormats?.jsonld
    if (!jsonLdFormat) {
      throw new AriesFrameworkError('Missing jsonld payload in createOffer')
    }

    // validate
    JsonTransformer.fromJSON(jsonLdFormat.credential, JsonLdCredentialDetail)

    const attachment = this.getFormatData(jsonLdFormat, format.attachId)

    return { format, attachment }
  }

  public async processOffer(agentContext: AgentContext, { attachment }: FormatProcessOptions) {
    const credentialOfferJson = attachment.getDataAsJson<JsonLdFormatDataCredentialDetail>()

    if (!credentialOfferJson) {
      throw new AriesFrameworkError('Missing jsonld credential offer data payload')
    }

    JsonTransformer.fromJSON(credentialOfferJson, JsonLdCredentialDetail)
  }

  public async acceptOffer(
    agentContext: AgentContext,
    { attachId, offerAttachment }: FormatAcceptOfferOptions<JsonLdCredentialFormat>
  ): Promise<CredentialFormatCreateReturn> {
    const credentialOffer = offerAttachment.getDataAsJson<JsonLdFormatDataCredentialDetail>()

    // validate
    JsonTransformer.fromJSON(credentialOffer, JsonLdCredentialDetail)

    const format = new CredentialFormatSpec({
      attachId,
      format: JSONLD_VC_DETAIL,
    })

    const attachment = this.getFormatData(credentialOffer, format.attachId)
    return { format, attachment }
  }

  /**
   * Create a credential attachment format for a credential request.
   *
   * @param options The object containing all the options for the credential request is derived
   * @returns object containing associated attachment, formats and requestAttach elements
   *
   */
  public async createRequest(
    agentContext: AgentContext,
    { credentialFormats }: FormatCreateRequestOptions<JsonLdCredentialFormat>
  ): Promise<CredentialFormatCreateReturn> {
    const jsonLdFormat = credentialFormats?.jsonld

    const format = new CredentialFormatSpec({
      format: JSONLD_VC_DETAIL,
    })

    if (!jsonLdFormat) {
      throw new AriesFrameworkError('Missing jsonld payload in createRequest')
    }

    // this does the validation
    JsonTransformer.fromJSON(jsonLdFormat.credential, JsonLdCredentialDetail)

    const attachment = this.getFormatData(jsonLdFormat, format.attachId)

    return { format, attachment }
  }

  public async processRequest(agentContext: AgentContext, { attachment }: FormatProcessOptions): Promise<void> {
    const requestJson = attachment.getDataAsJson<JsonLdFormatDataCredentialDetail>()

    if (!requestJson) {
      throw new AriesFrameworkError('Missing jsonld credential request data payload')
    }

    // validate
    JsonTransformer.fromJSON(requestJson, JsonLdCredentialDetail)
  }

  public async acceptRequest(
    agentContext: AgentContext,
    { credentialFormats, attachId, requestAttachment }: FormatAcceptRequestOptions<JsonLdCredentialFormat>
  ): Promise<CredentialFormatCreateReturn> {
    const w3cCredentialService = agentContext.dependencyManager.resolve(W3cCredentialService)

    // sign credential here. credential to be signed is received as the request attachment
    // (attachment in the request message from holder to issuer)
    const credentialRequest = requestAttachment.getDataAsJson<JsonLdFormatDataCredentialDetail>()

    const verificationMethod =
      credentialFormats?.jsonld?.verificationMethod ??
      (await this.deriveVerificationMethod(agentContext, credentialRequest.credential, credentialRequest))

    if (!verificationMethod) {
      throw new AriesFrameworkError('Missing verification method in credential data')
    }
    const format = new CredentialFormatSpec({
      attachId,
      format: JSONLD_VC,
    })

    const options = credentialRequest.options

    // Get a list of fields found in the options that are not supported at the moment
    const unsupportedFields = ['challenge', 'domain', 'credentialStatus', 'created'] as const
    const foundFields = unsupportedFields.filter((field) => options[field] !== undefined)

    if (foundFields.length > 0) {
      throw new AriesFrameworkError(
        `Some fields are not currently supported in credential options: ${foundFields.join(', ')}`
      )
    }

    const credential = JsonTransformer.fromJSON(credentialRequest.credential, W3cCredential)

    const verifiableCredential = await w3cCredentialService.signCredential(agentContext, {
      credential,
      proofType: credentialRequest.options.proofType,
      verificationMethod: verificationMethod,
    })

    const attachment = this.getFormatData(verifiableCredential, format.attachId)
    return { format, attachment }
  }

  /**
   * Derive a verification method using the issuer from the given verifiable credential
   * @param credentialAsJson the verifiable credential we want to sign
   * @return the verification method derived from this credential and its associated issuer did, keys etc.
   */
  private async deriveVerificationMethod(
    agentContext: AgentContext,
    credentialAsJson: JsonCredential,
    credentialRequest: JsonLdFormatDataCredentialDetail
  ): Promise<string> {
    const didResolver = agentContext.dependencyManager.resolve(DidResolverService)
    const w3cCredentialService = agentContext.dependencyManager.resolve(W3cCredentialService)

    const credential = JsonTransformer.fromJSON(credentialAsJson, W3cCredential)

    // extract issuer from vc (can be string or Issuer)
    let issuerDid = credential.issuer

    if (typeof issuerDid !== 'string') {
      issuerDid = issuerDid.id
    }
    // this will throw an error if the issuer did is invalid
    const issuerDidDocument = await didResolver.resolveDidDocument(agentContext, issuerDid)

    // find first key which matches proof type
    const proofType = credentialRequest.options.proofType

    // actually gets the key type(s)
    const keyType = w3cCredentialService.getVerificationMethodTypesByProofType(proofType)

    if (!keyType || keyType.length === 0) {
      throw new AriesFrameworkError(`No Key Type found for proofType ${proofType}`)
    }

    const verificationMethod = await findVerificationMethodByKeyType(keyType[0], issuerDidDocument)
    if (!verificationMethod) {
      throw new AriesFrameworkError(`Missing verification method for key type ${keyType}`)
    }

    return verificationMethod.id
  }
  /**
   * Processes an incoming credential - retrieve metadata, retrieve payload and store it in the Indy wallet
   * @param options the issue credential message wrapped inside this object
   * @param credentialRecord the credential exchange record for this credential
   */
  public async processCredential(
    agentContext: AgentContext,
    { credentialRecord, attachment, requestAttachment }: FormatProcessCredentialOptions
  ): Promise<void> {
    const w3cCredentialService = agentContext.dependencyManager.resolve(W3cCredentialService)

    const credentialAsJson = attachment.getDataAsJson<W3cVerifiableCredential>()
    const credential = JsonTransformer.fromJSON(credentialAsJson, W3cVerifiableCredential)
    const requestAsJson = requestAttachment.getDataAsJson<JsonLdFormatDataCredentialDetail>()

    // Verify the credential request matches the credential
    this.verifyReceivedCredentialMatchesRequest(credential, requestAsJson)

    // verify signatures of the credential
    const result = await w3cCredentialService.verifyCredential(agentContext, { credential })
    if (result && !result.verified) {
      throw new AriesFrameworkError(`Failed to validate credential, error = ${result.error}`)
    }

    const verifiableCredential = await w3cCredentialService.storeCredential(agentContext, {
      credential: credential,
    })

    credentialRecord.credentials.push({
      credentialRecordType: this.credentialRecordType,
      credentialRecordId: verifiableCredential.id,
    })
  }

  private verifyReceivedCredentialMatchesRequest(
    credential: W3cVerifiableCredential,
    request: JsonLdFormatDataCredentialDetail
  ): void {
    const jsonCredential = JsonTransformer.toJSON(credential)
    delete jsonCredential.proof

    if (Array.isArray(credential.proof)) {
      throw new AriesFrameworkError('Credential proof arrays are not supported')
    }

    if (request.options.created && credential.proof.created !== request.options.created) {
      throw new AriesFrameworkError('Received credential proof created does not match created from credential request')
    }

    if (credential.proof.domain !== request.options.domain) {
      throw new AriesFrameworkError('Received credential proof domain does not match domain from credential request')
    }

    if (credential.proof.challenge !== request.options.challenge) {
      throw new AriesFrameworkError(
        'Received credential proof challenge does not match challenge from credential request'
      )
    }

    if (credential.proof.type !== request.options.proofType) {
      throw new AriesFrameworkError('Received credential proof type does not match proof type from credential request')
    }

    if (credential.proof.proofPurpose !== request.options.proofPurpose) {
      throw new AriesFrameworkError(
        'Received credential proof purpose does not match proof purpose from credential request'
      )
    }

    // Check whether the received credential (minus the proof) matches the credential request
    if (!areObjectsEqual(jsonCredential, request.credential)) {
      throw new AriesFrameworkError('Received credential does not match credential request')
    }

    // TODO: add check for the credentialStatus once this is supported in AFJ
  }

  public supportsFormat(format: string): boolean {
    const supportedFormats = [JSONLD_VC_DETAIL, JSONLD_VC]

    return supportedFormats.includes(format)
  }

  public async deleteCredentialById(): Promise<void> {
    throw new Error('Not implemented.')
  }

  public areCredentialsEqual = (message1: V1Attachment, message2: V1Attachment): boolean => {
    const obj1 = message1.getDataAsJson()
    const obj2 = message2.getDataAsJson()

    return areObjectsEqual(obj1, obj2)
  }

  public shouldAutoRespondToProposal(
    agentContext: AgentContext,
    { offerAttachment, proposalAttachment }: FormatAutoRespondProposalOptions
  ) {
    return this.areCredentialsEqual(proposalAttachment, offerAttachment)
  }

  public shouldAutoRespondToOffer(
    agentContext: AgentContext,
    { offerAttachment, proposalAttachment }: FormatAutoRespondOfferOptions
  ) {
    return this.areCredentialsEqual(proposalAttachment, offerAttachment)
  }

  public shouldAutoRespondToRequest(
    agentContext: AgentContext,
    { offerAttachment, requestAttachment }: FormatAutoRespondRequestOptions
  ) {
    return this.areCredentialsEqual(offerAttachment, requestAttachment)
  }

  public shouldAutoRespondToCredential(
    agentContext: AgentContext,
    { requestAttachment, credentialAttachment }: FormatAutoRespondCredentialOptions
  ) {
    const credentialJson = credentialAttachment.getDataAsJson<JsonLdFormatDataVerifiableCredential>()
    const w3cCredential = JsonTransformer.fromJSON(credentialJson, W3cVerifiableCredential)
    const request = requestAttachment.getDataAsJson<JsonLdFormatDataCredentialDetail>()

    try {
      // This check is also done in the processCredential method, but we do it here as well
      // to be certain we don't skip the check
      this.verifyReceivedCredentialMatchesRequest(w3cCredential, request)

      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Returns an object of type {@link V1Attachment} for use in credential exchange messages.
   * It looks up the correct format identifier and encodes the data as a base64 attachment.
   *
   * @param data The data to include in the attach object
   * @param id the attach id from the formats component of the message
   */
  public getFormatData(data: unknown, id: string): V1Attachment {
    const attachment = new V1Attachment({
      id,
      mimeType: 'application/json',
      data: new V1AttachmentData({
        base64: JsonEncoder.toBase64(data),
      }),
    })

    return attachment
  }
}