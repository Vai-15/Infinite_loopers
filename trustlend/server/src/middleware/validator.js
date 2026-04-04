const Joi = require("joi");

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function validateAddressParam(paramName = "address") {
    return (req, res, next) => {
        const value = req.params[paramName];
        if (!value || !ETH_ADDRESS_REGEX.test(value)) {
            return res.status(400).json({
                error: `Invalid Ethereum address for parameter '${paramName}'.`
            });
        }

        req.params[paramName] = value.toLowerCase();
        return next();
    };
}

const loanMetadataSchema = Joi.object({
    loanId: Joi.number().integer().min(0).required(),
    description: Joi.string().trim().min(3).max(300).required(),
    purpose: Joi.string().trim().min(2).max(120).required(),
    ipfsHash: Joi.string().trim().max(200).allow("", null).optional()
}).required();

function validateLoanMetadataBody(req, res, next) {
    const { error, value } = loanMetadataSchema.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: false,
        convert: true
    });

    if (error) {
        return res.status(400).json({
            error: "Invalid request body.",
            details: error.details.map((detail) => detail.message)
        });
    }

    req.body = value;
    return next();
}

module.exports = {
    validateAddressParam,
    validateLoanMetadataBody,
    ETH_ADDRESS_REGEX
};
