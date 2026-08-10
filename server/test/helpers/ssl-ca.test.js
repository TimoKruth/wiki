const fs = require('fs')
const path = require('path')
const sslCa = require('../../helpers/ssl-ca')

describe('helpers/ssl-ca', () => {
  it('loads a certificate from a file path', () => {
    const certificatePath = path.join(__dirname, '../../../node_modules/public-encrypt/test/test_cert.pem')
    expect(sslCa.resolve(certificatePath, process.cwd())).toEqual(fs.readFileSync(certificatePath))
  })

  it('keeps headerless certificate data compatible with the existing env format', () => {
    expect(sslCa.resolve('YWJj', process.cwd())).toBe('-----BEGIN CERTIFICATE-----\nYWJj\n-----END CERTIFICATE-----\n')
  })
})
