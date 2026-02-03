export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const webhookUrl = process.env.WEBHOOK_URL;

    if (!webhookUrl) {
        return new Response(JSON.stringify({ error: 'Server Configuration Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await req.json();
        const data = body;

        // Basic validation
        if (!data || typeof data !== 'object') {
            return new Response(JSON.stringify({ error: 'Invalid data payload' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        // Forward the status and any JSON response from the webhook
        const responseData = await response.text();
        let parsedData;
        try {
            parsedData = JSON.parse(responseData);
        } catch (e) {
            parsedData = { message: responseData };
        }

        return new Response(JSON.stringify(parsedData), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Failed to communicate with document service' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
