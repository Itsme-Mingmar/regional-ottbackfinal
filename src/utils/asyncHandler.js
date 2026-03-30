const asyncHandler = (fn) => {
    return async (req, res, next) => {
        try {
            await fn(req, res, next);
        } catch (error) {
            console.error("UPLOAD ERROR:", error.message);
            console.error(error);
            res.status(error.status || 500).json({
                success: false,
                message: error.message
            });
        }
    }
}
export default asyncHandler;