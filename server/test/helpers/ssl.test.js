const fs = require('fs')
const path = require('path')
const sslHelper = require('../../helpers/ssl')

describe('helpers/ssl', () => {
  it('reads the expiration date from the certificate itself', () => {
    const certificate = fs.readFileSync(path.join(__dirname, '../../../node_modules/public-encrypt/test/test_cert.pem'))
    expect(sslHelper.getCertificateExpiration(certificate)).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('returns null for invalid certificate data', () => {
    expect(sslHelper.getCertificateExpiration('invalid')).toBeNull()
  })
})
